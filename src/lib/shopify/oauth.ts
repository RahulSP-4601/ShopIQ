import crypto from "crypto";

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY!;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET!;
const SHOPIFY_SCOPES = process.env.SHOPIFY_SCOPES || "read_orders,read_products,read_customers";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

// Encryption key for tokens - key is hashed to 32 bytes via SHA-256 for AES-256-GCM
// TOKEN_ENCRYPTION_KEY is required — no fallback to avoid using shared secrets
const TOKEN_ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY;
if (!TOKEN_ENCRYPTION_KEY || TOKEN_ENCRYPTION_KEY.trim() === "") {
  throw new Error(
    "TOKEN_ENCRYPTION_KEY environment variable is required for token encryption. " +
    "Set it to a strong random secret (e.g., openssl rand -hex 32)."
  );
}

/**
 * Derive a 32-byte encryption key, optionally scoped to a marketplace.
 * When marketplace is provided, uses HKDF to derive an isolated key.
 * Without marketplace, falls back to the legacy SHA-256 derivation for backward compatibility.
 */
function deriveKey(marketplace?: string): Buffer {
  if (marketplace) {
    // HKDF: extract with SHA-256, then expand with marketplace-specific info
    const ikm = Buffer.from(TOKEN_ENCRYPTION_KEY!, "utf8");
    // IMPORTANT: Do NOT rename this salt — it derives the AES-256-GCM key for all existing encrypted tokens.
    // Changing it would make every stored token (OAuth, PII) permanently undecryptable.
    const salt = crypto.createHash("sha256").update("shopiq-token-encryption").digest();
    const info = Buffer.from(`marketplace:${marketplace}`, "utf8");
    // HKDF-Extract
    const prk = crypto.createHmac("sha256", salt).update(ikm).digest();
    // HKDF-Expand (single block is sufficient for 32 bytes with SHA-256)
    const expanded = crypto
      .createHmac("sha256", prk)
      .update(Buffer.concat([info, Buffer.from([1])]))
      .digest();
    return expanded;
  }
  // Legacy: simple SHA-256 hash of the key
  return crypto.createHash("sha256").update(TOKEN_ENCRYPTION_KEY!).digest();
}

/**
 * Encrypt a token using AES-256-GCM
 * Returns base64-encoded string: iv:authTag:ciphertext
 * @param marketplace - Optional marketplace identifier for per-marketplace key isolation
 */
export function encryptToken(token: string, marketplace?: string): string {
  const key = deriveKey(marketplace);
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext (all base64)
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

/**
 * Decrypt a token encrypted with encryptToken
 * @param marketplace - Must match the marketplace used during encryption
 */
export function decryptToken(encryptedToken: string, marketplace?: string): string {
  const key = deriveKey(marketplace);
  const [ivBase64, authTagBase64, ciphertextBase64] = encryptedToken.split(":");

  if (!ivBase64 || !authTagBase64 || !ciphertextBase64) {
    throw new Error("Invalid encrypted token format");
  }

  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const ciphertext = Buffer.from(ciphertextBase64, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function buildAuthUrl(shop: string, nonce: string): string {
  const redirectUri = `${APP_URL}/api/auth/shopify/callback`;

  const params = new URLSearchParams({
    client_id: SHOPIFY_API_KEY,
    scope: SHOPIFY_SCOPES,
    redirect_uri: redirectUri,
    state: nonce,
  });

  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

export function validateHmac(query: Record<string, string>): boolean {
  const { hmac, ...rest } = query;

  if (!hmac) return false;

  const sortedParams = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${rest[key]}`)
    .join("&");

  const generatedHmac = crypto
    .createHmac("sha256", SHOPIFY_API_SECRET)
    .update(sortedParams)
    .digest("hex");

  // timingSafeEqual throws if buffer lengths differ, so check first
  if (hmac.length !== generatedHmac.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(hmac),
    Buffer.from(generatedHmac)
  );
}

export function validateShopDomain(shop: string): boolean {
  const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
  return shopRegex.test(shop);
}

export async function exchangeCodeForToken(
  shop: string,
  code: string
): Promise<{ accessToken: string; scope: string }> {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET,
      code,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    scope: data.scope,
  };
}
