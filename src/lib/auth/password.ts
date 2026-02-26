import bcrypt from "bcryptjs";
import crypto from "crypto";

const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 * Note: bcrypt truncates passwords longer than 72 bytes, so we enforce a maximum length
 */
export function validatePassword(password: string): {
  valid: boolean;
  error?: string;
} {
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters" };
  }
  // bcrypt truncates passwords > 72 bytes, which could lead to security issues
  // Use byte length check since multi-byte UTF-8 characters count as multiple bytes
  if (Buffer.byteLength(password, "utf8") > 72) {
    return { valid: false, error: "Password must be at most 72 bytes (UTF-8)" };
  }
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one uppercase letter",
    };
  }
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one lowercase letter",
    };
  }
  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one number",
    };
  }
  return { valid: true };
}

/**
 * Generate a cryptographically secure random token for password reset
 * Uses Node's crypto.randomBytes for secure randomness
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Hash a reset token using SHA-256 for secure storage
 * The unhashed token is sent to the user; only the hash is stored in the database
 */
export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Verify a reset token against its stored hash
 * Uses timing-safe comparison with length check to prevent timing attacks
 */
export function verifyResetToken(token: string, hash: string): boolean {
  const tokenHash = hashResetToken(token);
  const tokenHashBuffer = Buffer.from(tokenHash);
  const hashBuffer = Buffer.from(hash);

  // Return false if lengths differ (timingSafeEqual throws on length mismatch)
  if (tokenHashBuffer.length !== hashBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(tokenHashBuffer, hashBuffer);
}
