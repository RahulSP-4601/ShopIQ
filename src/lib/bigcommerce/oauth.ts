/**
 * BigCommerce OAuth 2.0 Utilities
 *
 * BigCommerce uses standard OAuth 2.0 with permanent access tokens (no refresh needed).
 * App install flow: https://developer.bigcommerce.com/docs/integrations/apps/guide/auth
 */

import crypto from "crypto";
import { encryptToken, decryptToken } from "@/lib/shopify/oauth";

export { encryptToken, decryptToken };

const BIGCOMMERCE_AUTH_URL = "https://login.bigcommerce.com/oauth2/authorize";
const BIGCOMMERCE_TOKEN_URL = "https://login.bigcommerce.com/oauth2/token";
const TOKEN_FETCH_TIMEOUT_MS = 15000;

// Scopes for orders, products, and store info
const BIGCOMMERCE_SCOPES = "store_v2_orders store_v2_products store_v2_information";

/**
 * Generate a random nonce for CSRF protection
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Build BigCommerce OAuth authorization URL
 */
export function buildAuthUrl(nonce: string): string {
  // Validate nonce: must be non-empty hex string (output of generateNonce)
  if (!nonce || !/^[a-f0-9]+$/i.test(nonce)) {
    throw new Error("Invalid nonce: must be a non-empty hex string");
  }

  const clientId = process.env.BIGCOMMERCE_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/auth/bigcommerce/callback`;

  if (!clientId) {
    throw new Error("BIGCOMMERCE_CLIENT_ID not configured");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: BIGCOMMERCE_SCOPES,
    redirect_uri: redirectUri,
    state: nonce,
  });

  return `${BIGCOMMERCE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 *
 * BigCommerce returns:
 * - access_token: permanent token (doesn't expire)
 * - scope: granted scopes
 * - context: "stores/{store_hash}"
 * - user: { id, username, email }
 */
export async function exchangeCodeForToken(
  code: string,
  context: string,
  scope: string
): Promise<{
  accessToken: string;
  storeHash: string;
  userId: number | null;
  userEmail: string | null;
}> {
  const clientId = process.env.BIGCOMMERCE_CLIENT_ID;
  const clientSecret = process.env.BIGCOMMERCE_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/auth/bigcommerce/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("BigCommerce credentials not configured");
  }

  // Require a trusted context parameter — never fall back to response body
  if (!context || typeof context !== "string") {
    throw new Error("BigCommerce token exchange failed: context parameter is required and must be a non-empty string");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TOKEN_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(BIGCOMMERCE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        context: context,
        scope: scope,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Sanitize: strip newlines and truncate to avoid leaking sensitive details
      const sanitized = errorText
        .replace(/[\r\n]+/g, " ")
        .slice(0, 200);
      throw new Error(`BigCommerce token exchange failed: ${response.status} - ${sanitized}`);
    }

    const data = await response.json();

    // Validate access_token exists in response
    if (!data.access_token) {
      throw new Error("BigCommerce token exchange failed: No access_token in response");
    }

    // Extract store hash from the trusted context parameter only (never from response body)
    const storeHashMatch = context.match(/^stores\/([a-z0-9]+)$/i);
    if (!storeHashMatch) {
      throw new Error("BigCommerce token exchange failed: Invalid or missing store hash in context");
    }
    const storeHash = storeHashMatch[1];

    return {
      accessToken: data.access_token,
      storeHash,
      userId: data.user?.id ?? null,
      userEmail: data.user?.email ?? null,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Note: BigCommerce access tokens are permanent and don't need refreshing.
 * They remain valid until the app is uninstalled or the token is manually revoked.
 */
