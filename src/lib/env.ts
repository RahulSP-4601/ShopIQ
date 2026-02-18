// -------------------------------------------------------
// Environment Variable Validation
// -------------------------------------------------------

const REQUIRED_VARS = [
  "DATABASE_URL",
  "SESSION_SECRET",
  "OPENAI_API_KEY",
  "CRON_SECRET",
];

// Required in production for security
const PRODUCTION_REQUIRED_VARS = [
  { name: "TOKEN_ENCRYPTION_KEY", minLength: 32 },
  { name: "JWT_SIGNING_SECRET", minLength: 32 },
];

// Optional but recommended for production
const RECOMMENDED_VARS = [
  "RESEND_API_KEY",
];

let validated = false;

/**
 * Validate that all required environment variables are set.
 * Must be called explicitly (e.g., at app startup). Idempotent via internal flag.
 * Throws immediately if a required var is missing.
 * Enforces TOKEN_ENCRYPTION_KEY and JWT_SIGNING_SECRET in production.
 * Warns for recommended but missing vars in production.
 */
export function validateEnv(): void {
  if (validated) return;

  const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        `Check your .env file or deployment environment.`
    );
  }

  if (process.env.NODE_ENV === "production") {
    const invalidProdSecrets = PRODUCTION_REQUIRED_VARS.filter((v) => {
      const val = process.env[v.name];
      return !val || val.length < v.minLength;
    });
    if (invalidProdSecrets.length > 0) {
      throw new Error(
        `Invalid production secrets: ${invalidProdSecrets.map((v) => `${v.name} (min ${v.minLength} chars)`).join(", ")}. ` +
          `These secrets are mandatory in production and must meet minimum length requirements.`
      );
    }

    // Validate SESSION_SECRET minimum length in production (deprecated but still used as fallback)
    const sessionSecret = process.env.SESSION_SECRET;
    if (sessionSecret && sessionSecret.length < 32) {
      throw new Error(
        `SESSION_SECRET must be at least 32 characters in production (current: ${sessionSecret.length}). ` +
        `Generate with: openssl rand -base64 32`
      );
    }

    const missingRecommended = RECOMMENDED_VARS.filter((v) => !process.env[v]);
    if (missingRecommended.length > 0) {
      console.warn(
        `[ENV] Missing recommended environment variables for production: ${missingRecommended.join(", ")}`
      );
    }
  }

  // Only mark validated after all checks pass — if any throw above, subsequent calls will retry
  validated = true;
}
