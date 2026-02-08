import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { exchangeCodeForToken, encryptToken } from "@/lib/square/oauth";
import { SquareClient } from "@/lib/square/client";
import { registerWebhooks, deregisterWebhooks } from "@/lib/square/webhooks";
import { getUserSession } from "@/lib/auth/session";

function clearSquareCookies(response: NextResponse): NextResponse {
  // Must specify path to match how cookies were set in /api/auth/square
  response.cookies.delete({ name: "square_nonce", path: "/" });
  response.cookies.delete({ name: "square_code_verifier", path: "/" });
  return response;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // Check for error from Square
  const error = searchParams.get("error");
  if (error) {
    const errorDescription = searchParams.get("error_description") || error;
    console.error("Square OAuth error:", errorDescription);
    return clearSquareCookies(
      NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error)}`, request.url))
    );
  }

  // Validate required params
  if (!code || !state) {
    return clearSquareCookies(
      NextResponse.redirect(new URL("/?error=missing_params", request.url))
    );
  }

  // Validate state/nonce
  const cookieStore = await cookies();
  const storedNonce = cookieStore.get("square_nonce")?.value;

  if (!storedNonce || storedNonce !== state) {
    return clearSquareCookies(
      NextResponse.redirect(new URL("/?error=invalid_state", request.url))
    );
  }

  // Retrieve PKCE code verifier
  const codeVerifier = cookieStore.get("square_code_verifier")?.value;

  if (!codeVerifier) {
    return clearSquareCookies(
      NextResponse.redirect(new URL("/?error=missing_verifier", request.url))
    );
  }

  try {
    // Check if user is logged in
    const session = await getUserSession();
    if (!session) {
      let response = NextResponse.redirect(
        new URL(
          "/signin?redirect=/onboarding/connect&square_restart=true",
          request.url
        )
      );
      response = clearSquareCookies(response);
      response.cookies.set("pending_square_connect", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 10,
        path: "/",
      });
      return response;
    }

    // Exchange code for tokens using PKCE
    const { accessToken, refreshToken, expiresAt, merchantId } =
      await exchangeCodeForToken(code, codeVerifier);

    if (!merchantId) {
      return clearSquareCookies(
        NextResponse.redirect(
          new URL("/?error=missing_merchant_id", request.url)
        )
      );
    }

    // Create client with plaintext token to get merchant info
    const client = new SquareClient(accessToken, false);
    const merchant = await client.getMerchant();

    // Encrypt tokens before storing
    const encryptedAccessToken = encryptToken(accessToken);
    const encryptedRefreshToken = encryptToken(refreshToken);

    // Register webhooks (use server-only APP_URL, not NEXT_PUBLIC_APP_URL)
    const appUrl = process.env.APP_URL;
    let encryptedWebhookSecret: string | null = null;
    let webhookUrl: string | null = null;
    let webhookCreatedInThisRequest = false;
    if (!appUrl && process.env.NODE_ENV === "production") {
      throw new Error(
        "Square webhook registration failed: APP_URL environment variable is required in production"
      );
    } else if (appUrl) {
      webhookUrl = `${appUrl}/api/webhooks/square`;
      const webhookResult = await registerWebhooks(client, webhookUrl);
      if (webhookResult?.signatureKey) {
        encryptedWebhookSecret = encryptToken(webhookResult.signatureKey);
        webhookCreatedInThisRequest = true;
      }
    }

    // Create or update marketplace connection
    // If upsert fails after webhooks were registered in THIS request, deregister them to compensate.
    // Only deregister if we actually created new webhooks (not if we reused existing ones).
    try {
      await prisma.marketplaceConnection.upsert({
        where: {
          userId_marketplace: {
            userId: session.userId,
            marketplace: "SQUARE",
          },
        },
        create: {
          userId: session.userId,
          marketplace: "SQUARE",
          status: "CONNECTED",
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiry: expiresAt,
          externalId: merchantId,
          externalName: merchant?.business_name || `Merchant ${merchantId}`,
          webhookSecret: encryptedWebhookSecret,
          connectedAt: new Date(),
        },
        update: {
          status: "CONNECTED",
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiry: expiresAt,
          externalId: merchantId,
          externalName: merchant?.business_name || `Merchant ${merchantId}`,
          // Only overwrite webhookSecret when we have a new one; preserve existing otherwise
          ...(encryptedWebhookSecret !== null ? { webhookSecret: encryptedWebhookSecret } : {}),
          connectedAt: new Date(),
        },
      });
    } catch (upsertError) {
      // Compensate: only deregister webhooks that were created in THIS request
      // to avoid removing pre-existing subscriptions
      if (webhookUrl && webhookCreatedInThisRequest) {
        try {
          await deregisterWebhooks(client, webhookUrl);
        } catch (deregError) {
          const msg = deregError instanceof Error ? deregError.message : "Unknown error";
          console.error(`Square OAuth: Failed to deregister webhooks after upsert failure: ${msg}`);
        }
      }
      throw upsertError;
    }

    // Note: Initial sync is handled by the scheduled cron job (/api/cron/sync)
    // to avoid serverless runtime timeouts. The connection is marked as CONNECTED
    // and will be picked up in the next sync cycle.

    return clearSquareCookies(
      NextResponse.redirect(new URL("/onboarding/connect", request.url))
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const name = error instanceof Error ? error.name : "Error";
    console.error(`Square OAuth callback error: [${name}] ${message}`);
    return clearSquareCookies(
      NextResponse.redirect(new URL("/?error=oauth_failed", request.url))
    );
  }
}
