/**
 * Token Re-encryption Script
 *
 * Re-encrypts all MarketplaceConnection tokens with a new encryption key.
 *
 * Usage:
 *   1. Set OLD_TOKEN_ENCRYPTION_KEY to the current key
 *   2. Set NEW_TOKEN_ENCRYPTION_KEY to the new key
 *   3. Run: npx tsx scripts/reencrypt-tokens.ts
 *   4. Verify by running a sample sync for one connection
 *   5. Once verified, update TOKEN_ENCRYPTION_KEY env var to the new key and redeploy
 *   6. Securely delete the old key material
 *
 * Rollback:
 *   If issues occur after step 5, swap TOKEN_ENCRYPTION_KEY back to the old value.
 *   The script is idempotent — tokens already encrypted with NEW_KEY are detected
 *   (via trial decryption) and skipped.
 *
 * Safety:
 *   - Processes one connection at a time in a DB transaction (read + re-encrypt + write is atomic)
 *   - Skips connections with null tokens
 *   - Logs progress and errors without exposing token values
 *   - Does NOT modify the live TOKEN_ENCRYPTION_KEY env var
 */

import crypto from "crypto";

const OLD_KEY = process.env.OLD_TOKEN_ENCRYPTION_KEY;
const NEW_KEY = process.env.NEW_TOKEN_ENCRYPTION_KEY;

if (!OLD_KEY || !NEW_KEY) {
  console.error("Both OLD_TOKEN_ENCRYPTION_KEY and NEW_TOKEN_ENCRYPTION_KEY must be set.");
  process.exit(1);
}

if (OLD_KEY === NEW_KEY) {
  console.error("Old and new keys are identical — nothing to do.");
  process.exit(1);
}

function deriveKeyFromSecret(secret: string): Buffer {
  return crypto.createHash("sha256").update(secret).digest();
}

function decrypt(encryptedToken: string, key: Buffer): string {
  const [ivBase64, authTagBase64, ciphertextBase64] = encryptedToken.split(":");
  if (!ivBase64 || !authTagBase64 || !ciphertextBase64) {
    throw new Error("Invalid encrypted token format");
  }
  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const ciphertext = Buffer.from(ciphertextBase64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

function encrypt(token: string, key: Buffer): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

async function main() {
  // Dynamic import to work with the project's Prisma setup
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  const oldKey = deriveKeyFromSecret(OLD_KEY!);
  const newKey = deriveKeyFromSecret(NEW_KEY!);

  try {
    const connections = await prisma.marketplaceConnection.findMany({
      select: {
        id: true,
        marketplace: true,
        accessToken: true,
        refreshToken: true,
        webhookSecret: true,
      },
    });

    console.log(`Found ${connections.length} marketplace connections to process.`);

    let success = 0;
    let noTokens = 0;
    let alreadyMigrated = 0;
    let deleted = 0;
    let failed = 0;

    for (const conn of connections) {
      try {
        // All logic (read, decrypt, re-encrypt, write) happens inside the transaction
        // to avoid TOCTOU issues with the redundant outer decryption
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const txResult = await prisma.$transaction(async (tx: any) => {
          // Read inside transaction to guard against concurrent modifications
          const freshConn = await tx.marketplaceConnection.findUnique({
            where: { id: conn.id },
            select: { accessToken: true, refreshToken: true, webhookSecret: true },
          });
          if (!freshConn) return "deleted" as const;

          const txFields: Record<string, string | null> = {};
          let hasTokens = false;

          for (const field of ["accessToken", "refreshToken", "webhookSecret"] as const) {
            const value = freshConn[field];
            if (!value) continue;
            hasTokens = true;

            // Idempotency: try NEW_KEY first — if it works, token is already migrated
            try {
              decrypt(value, newKey);
              // Decrypted successfully with new key — already migrated, skip
              continue;
            } catch {
              // Can't decrypt with new key — needs migration, decrypt with old key
            }

            const decrypted = decrypt(value, oldKey);
            txFields[field] = encrypt(decrypted, newKey);
          }

          if (!hasTokens) return "no_tokens" as const;

          if (Object.keys(txFields).length === 0) {
            // All tokens already encrypted with new key
            return "already_migrated" as const;
          }

          await tx.marketplaceConnection.update({
            where: { id: conn.id },
            data: txFields,
          });
          return "updated" as const;
        });

        if (txResult === "deleted") {
          deleted++;
          console.log(`  [DELETED] ${conn.marketplace} (${conn.id}) — connection removed mid-process`);
        } else if (txResult === "no_tokens") {
          noTokens++;
          console.log(`  [SKIP] ${conn.marketplace} (${conn.id}) — no tokens`);
        } else if (txResult === "already_migrated") {
          alreadyMigrated++;
          console.log(`  [SKIP] ${conn.marketplace} (${conn.id}) — already migrated`);
        } else {
          success++;
          console.log(`  [OK] ${conn.marketplace} (${conn.id})`);
        }
      } catch (error) {
        failed++;
        const msg = error instanceof Error ? error.message : "Unknown error";
        console.error(`  [FAIL] ${conn.marketplace} (${conn.id}): ${msg}`);
      }
    }

    console.log(`\nResults: ${success} re-encrypted, ${noTokens} skipped (no tokens), ${alreadyMigrated} skipped (already migrated), ${deleted} deleted mid-process, ${failed} failed.`);

    if (failed > 0) {
      console.error("\nSome connections failed. Investigate before updating TOKEN_ENCRYPTION_KEY.");
      process.exit(1);
    }

    console.log("\nNext steps:");
    console.log("  1. Test a sample sync to verify tokens work with the new key");
    console.log("  2. Update TOKEN_ENCRYPTION_KEY to the new key value");
    console.log("  3. Redeploy the application");
    console.log("  4. Securely delete OLD_TOKEN_ENCRYPTION_KEY");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Re-encryption script failed:", error);
  process.exit(1);
});
