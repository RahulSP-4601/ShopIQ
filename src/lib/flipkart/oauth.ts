import crypto from "crypto";
import { encryptToken, decryptToken } from "@/lib/shopify/oauth";

const FLIPKART_APP_ID = process.env.FLIPKART_APP_ID!;
const FLIPKART_APP_SECRET = process.env.FLIPKART_APP_SECRET!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

// Re-export encryption utilities for convenience
export { encryptToken, decryptToken };

export function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function buildAuthUrl(nonce: string): string {
  const redirectUri = `${APP_URL}/api/auth/flipkart/callback`;

  const params = new URLSearchParams({
    client_id: FLIPKART_APP_ID,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "Seller_Api",
    state: nonce,
  });

  return `https://api.flipkart.net/oauth-service/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(
  code: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const redirectUri = `${APP_URL}/api/auth/flipkart/callback`;
  const basicAuth = Buffer.from(
    `${FLIPKART_APP_ID}:${FLIPKART_APP_SECRET}`
  ).toString("base64");

  const response = await fetch(
    "https://api.flipkart.net/oauth-service/oauth/token",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }).toString(),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for token: ${error}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const basicAuth = Buffer.from(
    `${FLIPKART_APP_ID}:${FLIPKART_APP_SECRET}`
  ).toString("base64");

  const response = await fetch(
    "https://api.flipkart.net/oauth-service/oauth/token",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }).toString(),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}
