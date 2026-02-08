/**
 * Square OAuth 2.0 Utilities with PKCE
 *
 * Square uses standard OAuth 2.0 with optional PKCE.
 * Access tokens expire after 30 days.
 * Refresh tokens rotate on each refresh.
 */

import crypto from "crypto";
import { encryptToken, decryptToken } from "@/lib/shopify/oauth";

export { encryptToken, decryptToken };

const SQUARE_AUTH_URL = "https://connect.squareup.com/oauth2/authorize";
const SQUARE_TOKEN_URL = "https://connect.squareup.com/oauth2/token";
const TOKEN_FETCH_TIMEOUT_MS = 15000;

// Scopes for orders, catalog, and merchant info
const SQUARE_SCOPES = [
  "ORDERS_READ",
  "ITEMS_READ",
  "MERCHANT_PROFILE_READ",
  "PAYMENTS_READ",
  "INVENTORY_READ",
].join(" ");

/**
 * Generate a random nonce for CSRF protection
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Generate PKCE code verifier (43-128 characters)
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Generate PKCE code challenge from verifier (S256 method)
 */
export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

/**
 * Build Square OAuth authorization URL with PKCE
 */
export function buildAuthUrl(nonce: string, codeChallenge: string): string {
  const clientId = process.env.SQUARE_APPLICATION_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/auth/square/callback`;

  if (!clientId) {
    throw new Error("SQUARE_APPLICATION_ID not configured");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: SQUARE_SCOPES,
    redirect_uri: redirectUri,
    state: nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `${SQUARE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens using PKCE
 */
export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  merchantId: string;
}> {
  const clientId = process.env.SQUARE_APPLICATION_ID;
  const clientSecret = process.env.SQUARE_APPLICATION_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/auth/square/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("Square credentials not configured");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TOKEN_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(SQUARE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Square-Version": "2024-01-18",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Square token exchange failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Validate required fields exist in response
    if (!data.access_token || typeof data.access_token !== "string") {
      throw new Error("Square token exchange failed: Missing or invalid access_token in response");
    }
    if (!data.refresh_token || typeof data.refresh_token !== "string") {
      throw new Error("Square token exchange failed: Missing or invalid refresh_token in response");
    }
    if (!data.merchant_id || typeof data.merchant_id !== "string") {
      throw new Error("Square token exchange failed: Missing or invalid merchant_id in response");
    }

    // Square returns expires_at as ISO string — validate parsed date
    const defaultExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    let expiresAt = defaultExpiry;
    if (data.expires_at) {
      const parsed = new Date(data.expires_at);
      expiresAt = isNaN(parsed.getTime()) ? defaultExpiry : parsed;
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
      merchantId: data.merchant_id,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Refresh an expired access token
 *
 * Note: Square rotates BOTH tokens on refresh
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  merchantId: string;
}> {
  const clientId = process.env.SQUARE_APPLICATION_ID;
  const clientSecret = process.env.SQUARE_APPLICATION_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Square credentials not configured");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TOKEN_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(SQUARE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Square-Version": "2024-01-18",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Square token refresh failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Validate required fields exist in response
    if (!data.access_token || typeof data.access_token !== "string") {
      throw new Error("Square token refresh failed: Missing or invalid access_token in response");
    }
    if (!data.refresh_token || typeof data.refresh_token !== "string") {
      throw new Error("Square token refresh failed: Missing or invalid refresh_token in response");
    }
    if (!data.merchant_id || typeof data.merchant_id !== "string") {
      throw new Error("Square token refresh failed: Missing or invalid merchant_id in response");
    }

    // Validate parsed date — fall back to 30-day default if malformed
    const refreshDefaultExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    let expiresAt = refreshDefaultExpiry;
    if (data.expires_at) {
      const parsed = new Date(data.expires_at);
      expiresAt = isNaN(parsed.getTime()) ? refreshDefaultExpiry : parsed;
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
      merchantId: data.merchant_id,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
