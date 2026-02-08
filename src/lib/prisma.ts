import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// ============================================
// STARTUP VALIDATIONS
// ============================================

// Validate SHOPIFY_LEGACY_SYNC_ENABLED is strictly 'true' or 'false'
const legacySyncFlag = process.env.SHOPIFY_LEGACY_SYNC_ENABLED;
if (legacySyncFlag !== undefined && legacySyncFlag !== "true" && legacySyncFlag !== "false") {
  throw new Error(
    `SHOPIFY_LEGACY_SYNC_ENABLED must be 'true' or 'false', got '${legacySyncFlag}'. ` +
    `Set it explicitly to enforce correct sync pipeline configuration.`
  );
}

// Validate encryption keys are configured in production
if (process.env.NODE_ENV === "production") {
  if (!process.env.TOKEN_ENCRYPTION_KEY) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY environment variable is required in production. " +
      "Generate with: openssl rand -base64 32"
    );
  }
  if (!process.env.JWT_SIGNING_SECRET) {
    throw new Error(
      "JWT_SIGNING_SECRET environment variable is required in production. " +
      "Generate with: openssl rand -base64 32"
    );
  }
}

// Emit deprecation warning if SESSION_SECRET is still being used
if (process.env.SESSION_SECRET) {
  if (!process.env.JWT_SIGNING_SECRET || !process.env.TOKEN_ENCRYPTION_KEY) {
    console.warn(
      "[DEPRECATION] SESSION_SECRET is deprecated. Migrate to JWT_SIGNING_SECRET (for JWT signing) " +
      "and TOKEN_ENCRYPTION_KEY (for token encryption). SESSION_SECRET fallback will be removed in a future release."
    );
  }
}

// ============================================
// PRISMA CLIENT
// ============================================

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
