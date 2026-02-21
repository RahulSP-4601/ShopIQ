import crypto from "crypto";
import { encryptToken, decryptToken } from "@/lib/shopify/oauth";

// SnapDeal uses a redirect-based authorization flow (not standard OAuth2).
// The seller visits SnapDeal's auth page, logs in, authorizes capabilities,
// and gets redirected back with X-Seller-AuthZ-Token in the URL.
const SNAPDEAL_AUTH_URL = "https://auth.snapdeal.com/oauth/authorize";

function getEnvOrThrow(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getSnapDealCredentials() {
  return {
    clientId: getEnvOrThrow("SNAPDEAL_CLIENT_ID"),
    authToken: getEnvOrThrow("SNAPDEAL_AUTH_TOKEN"),
  };
}

// Re-export encryption utilities for convenience
export { encryptToken, decryptToken };

export function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Build the SnapDeal authorization URL.
 *
 * NOTE: SnapDeal uses a redirect-based implicit grant flow (response_type=token),
 * NOT standard OAuth2 Authorization Code. The seller token is returned directly
 * in the callback URL. SnapDeal's seller API does not support Authorization Code
 * with PKCE — the implicit flow is the only option available per their docs.
 * See: https://sellerapis.snapdeal.com/
 */
export function buildAuthUrl(nonce: string): string {
  const { clientId } = getSnapDealCredentials();

  // APP_URL is server-side only (not NEXT_PUBLIC_)
  // In production, APP_URL must be set — fallback to localhost only in dev
  let appUrl: string;
  if (process.env.NODE_ENV === "production") {
    appUrl = getEnvOrThrow("APP_URL");
  } else {
    appUrl = process.env.APP_URL || "http://localhost:3000";
    if (!process.env.APP_URL) {
      console.warn(
        "SnapDeal OAuth: APP_URL not set, falling back to http://localhost:3000 (dev only)"
      );
    }
  }
  const redirectUri = `${appUrl}/api/auth/snapdeal/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state: nonce,
    response_type: "token",
  });

  return `${SNAPDEAL_AUTH_URL}?${params.toString()}`;
}

/**
 * Get the app-level auth token (X-Auth-Token) from environment.
 * This is NOT the seller token — it's the API user registration token.
 */
export function getAuthToken(): string {
  return getSnapDealCredentials().authToken;
}

/**
 * Get the client ID from environment.
 */
export function getClientId(): string {
  return getSnapDealCredentials().clientId;
}
