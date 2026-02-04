import crypto from "crypto";
import { encryptToken, decryptToken } from "@/lib/shopify/oauth";

const EBAY_AUTH_URL = "https://auth.ebay.com/oauth2/authorize";
const EBAY_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const TOKEN_FETCH_TIMEOUT_MS = 10_000;

// Scopes for seller analytics: orders, inventory, analytics, finances, identity
const EBAY_SCOPES = [
  "https://api.ebay.com/oauth/api_scope",
  "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.analytics.readonly",
  "https://api.ebay.com/oauth/api_scope/sell.finances",
  "https://api.ebay.com/oauth/api_scope/commerce.identity.readonly",
].join(" ");

function getEnvOrThrow(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getEbayCredentials() {
  return {
    clientId: getEnvOrThrow("EBAY_CLIENT_ID"),
    clientSecret: getEnvOrThrow("EBAY_CLIENT_SECRET"),
    ruName: getEnvOrThrow("EBAY_RU_NAME"),
  };
}

// Re-export encryption utilities for convenience
export { encryptToken, decryptToken };

export function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function buildAuthUrl(nonce: string): string {
  const { clientId, ruName } = getEbayCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: ruName,
    scope: EBAY_SCOPES,
    state: nonce,
  });

  return `${EBAY_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(
  code: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const { clientId, clientSecret, ruName } = getEbayCredentials();
  const basicAuth = Buffer.from(
    `${clientId}:${clientSecret}`
  ).toString("base64");

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    TOKEN_FETCH_TIMEOUT_MS
  );

  try {
    const response = await fetch(EBAY_TOKEN_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: ruName,
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
        `eBay token exchange returned invalid response structure (keys: ${safeKeys})`
      );
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: Number(data.expires_in),
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        `eBay token exchange timed out after ${TOKEN_FETCH_TIMEOUT_MS}ms`
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Refresh an expired eBay access token.
 * eBay does NOT rotate refresh tokens — only the access token changes.
 * The same refresh token remains valid for 18 months.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const { clientId, clientSecret } = getEbayCredentials();
  const basicAuth = Buffer.from(
    `${clientId}:${clientSecret}`
  ).toString("base64");

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    TOKEN_FETCH_TIMEOUT_MS
  );

  try {
    const response = await fetch(EBAY_TOKEN_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        scope: EBAY_SCOPES,
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
      (typeof data.expires_in !== "number" &&
        typeof data.expires_in !== "string")
    ) {
      const safeKeys = data ? Object.keys(data).join(", ") : "null";
      throw new Error(
        `eBay token refresh returned invalid response structure (${response.status} ${response.statusText}, keys: ${safeKeys})`
      );
    }

    return {
      accessToken: data.access_token,
      expiresIn: Number(data.expires_in),
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        `eBay token refresh timed out after ${TOKEN_FETCH_TIMEOUT_MS}ms`
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
