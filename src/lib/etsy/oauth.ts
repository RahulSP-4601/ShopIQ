import crypto from "crypto";
import { encryptToken, decryptToken } from "@/lib/shopify/oauth";

const ETSY_AUTH_URL = "https://www.etsy.com/oauth/connect";
const ETSY_TOKEN_URL = "https://api.etsy.com/v3/public/oauth/token";
const TOKEN_FETCH_TIMEOUT_MS = 10_000;

const ETSY_SCOPES = "shops_r transactions_r listings_r profile_r email_r";

function getEnvOrThrow(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getEtsyApiKey(): string {
  return getEnvOrThrow("ETSY_API_KEY");
}

// Re-export encryption utilities for convenience
export { encryptToken, decryptToken };

export function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Generate a PKCE code verifier (43-128 chars, base64url encoded).
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Generate a PKCE code challenge from a code verifier using S256 method.
 */
export function generateCodeChallenge(codeVerifier: string): string {
  return crypto.createHash("sha256").update(codeVerifier).digest("base64url");
}

export function buildAuthUrl(nonce: string, codeChallenge: string): string {
  const apiKey = getEtsyApiKey();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
  const redirectUri = `${appUrl}/api/auth/etsy/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: apiKey,
    redirect_uri: redirectUri,
    scope: ETSY_SCOPES,
    state: nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `${ETSY_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange an authorization code for tokens using PKCE.
 * Etsy uses a public client flow — no client_secret, only code_verifier.
 */
export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const apiKey = getEtsyApiKey();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
  const redirectUri = `${appUrl}/api/auth/etsy/callback`;

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    TOKEN_FETCH_TIMEOUT_MS
  );

  try {
    const response = await fetch(ETSY_TOKEN_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: apiKey,
        redirect_uri: redirectUri,
        code,
        code_verifier: codeVerifier,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for token: ${error}`);
    }

    const data = await response.json();

    if (
      !data ||
      typeof data.access_token !== "string" ||
      typeof data.refresh_token !== "string" ||
      (typeof data.expires_in !== "number" &&
        typeof data.expires_in !== "string")
    ) {
      const safeKeys = data ? Object.keys(data).join(", ") : "null";
      throw new Error(
        `Etsy token exchange returned invalid response structure (keys: ${safeKeys})`
      );
    }

    const expiresIn = Number(data.expires_in);
    if (Number.isNaN(expiresIn) || expiresIn <= 0) {
      throw new Error(
        `Etsy token exchange returned invalid expires_in: ${data.expires_in}`
      );
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn,
    };
  } catch (error) {
    // Detect AbortError in both browser (DOMException) and Node.js environments
    const isAbortError =
      (error instanceof DOMException && error.name === "AbortError") ||
      (error instanceof Error && error.name === "AbortError");
    if (isAbortError) {
      throw new Error(
        `Etsy token exchange timed out after ${TOKEN_FETCH_TIMEOUT_MS}ms`
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Refresh an expired Etsy access token.
 * Etsy DOES rotate refresh tokens — both access and refresh tokens change.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const apiKey = getEtsyApiKey();

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    TOKEN_FETCH_TIMEOUT_MS
  );

  try {
    const response = await fetch(ETSY_TOKEN_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: apiKey,
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh token: ${error}`);
    }

    const data = await response.json();

    if (
      !data ||
      typeof data.access_token !== "string" ||
      typeof data.refresh_token !== "string" ||
      (typeof data.expires_in !== "number" &&
        typeof data.expires_in !== "string")
    ) {
      const safeKeys = data ? Object.keys(data).join(", ") : "null";
      throw new Error(
        `Etsy token refresh returned invalid response structure (keys: ${safeKeys})`
      );
    }

    const expiresIn = Number(data.expires_in);
    if (Number.isNaN(expiresIn) || expiresIn <= 0) {
      throw new Error(
        `Etsy token refresh returned invalid expires_in: ${data.expires_in}`
      );
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn,
    };
  } catch (error) {
    // Detect AbortError in both browser (DOMException) and Node.js environments
    const isAbortError =
      (error instanceof DOMException && error.name === "AbortError") ||
      (error instanceof Error && error.name === "AbortError");
    if (isAbortError) {
      throw new Error(
        `Etsy token refresh timed out after ${TOKEN_FETCH_TIMEOUT_MS}ms`
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
