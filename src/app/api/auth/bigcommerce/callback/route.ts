import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { exchangeCodeForToken, encryptToken } from "@/lib/bigcommerce/oauth";
import { BigCommerceClient } from "@/lib/bigcommerce/client";
import { registerWebhooks } from "@/lib/bigcommerce/webhooks";
import { getUserSession } from "@/lib/auth/session";
import { consumeOAuthReturnPath } from "@/lib/auth/oauth-return";

function clearNonceCookie(response: NextResponse): NextResponse {
  // Must specify path to match how cookie was set in /api/auth/bigcommerce
  response.cookies.delete({ name: "bigcommerce_nonce", path: "/" });
  return response;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const context = searchParams.get("context");
  const scope = searchParams.get("scope");
  const state = searchParams.get("state");

  // Validate required params
  if (!code || !context || !scope) {
    return clearNonceCookie(
      NextResponse.redirect(new URL("/?error=missing_params", request.url))
    );
  }

  // Validate state/nonce - both must be present and match
  const cookieStore = await cookies();
  const storedNonce = cookieStore.get("bigcommerce_nonce")?.value;

  if (!storedNonce || !state || storedNonce !== state) {
    return clearNonceCookie(
      NextResponse.redirect(new URL("/?error=invalid_state", request.url))
    );
  }

  try {
    // Check if user is logged in
    const session = await getUserSession();
    if (!session) {
      const response = NextResponse.redirect(
        new URL(
          "/signin?redirect=/onboarding/connect&bigcommerce_restart=true",
          request.url
        )
      );
      clearNonceCookie(response);
      response.cookies.set("pending_bigcommerce_connect", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 10,
        path: "/",
      });
      return response;
    }

    // Exchange code for access token
    const { accessToken, storeHash } =
      await exchangeCodeForToken(code, context, scope);

    // Validate required fields from token exchange
    if (!accessToken) {
      return clearNonceCookie(
        NextResponse.redirect(
          new URL("/?error=missing_access_token", request.url)
        )
      );
    }

    if (!storeHash) {
      return clearNonceCookie(
        NextResponse.redirect(
          new URL("/?error=missing_store_hash", request.url)
        )
      );
    }

    // Validate APP_URL early in production to prevent persisting
    // a CONNECTED state without webhook support
    const appUrl = process.env.APP_URL;
    if (!appUrl && process.env.NODE_ENV === "production") {
      throw new Error(
        "BigCommerce OAuth callback failed: APP_URL environment variable is required in production"
      );
    }

    // Create client with plaintext token to get store info
    const client = new BigCommerceClient(storeHash, accessToken, false);
    const storeInfo = await client.getStoreInfo();

    // Encrypt token before storing
    const encryptedAccessToken = encryptToken(accessToken);

    // Create or update marketplace connection
    // BigCommerce tokens don't expire, so no tokenExpiry needed
    await prisma.marketplaceConnection.upsert({
      where: {
        userId_marketplace: {
          userId: session.userId,
          marketplace: "BIGCOMMERCE",
        },
      },
      create: {
        userId: session.userId,
        marketplace: "BIGCOMMERCE",
        status: "CONNECTED",
        accessToken: encryptedAccessToken,
        // No refresh token needed - BigCommerce tokens are permanent
        refreshToken: null,
        tokenExpiry: null,
        externalId: storeHash,
        externalName: storeInfo?.name || `Store ${storeHash}`,
        connectedAt: new Date(),
      },
      update: {
        status: "CONNECTED",
        accessToken: encryptedAccessToken,
        refreshToken: null,
        tokenExpiry: null,
        externalId: storeHash,
        externalName: storeInfo?.name || `Store ${storeHash}`,
        connectedAt: new Date(),
      },
    });

    // Register webhooks for real-time updates (use server-only APP_URL)
    if (appUrl) {
      try {
        const normalizedAppUrl = appUrl.replace(/\/+$/, "");
        const webhookUrl = `${normalizedAppUrl}/api/webhooks/bigcommerce`;
        await registerWebhooks(client, webhookUrl);
      } catch (webhookError) {
        // Log but don't fail the connection if webhook registration fails
        console.error("Failed to register BigCommerce webhooks:", webhookError);
      }
    }

    // Note: Initial sync is handled by the scheduled cron job (/api/cron/sync)
    // to avoid serverless runtime timeouts. The connection is marked as CONNECTED
    // and will be picked up in the next sync cycle.

    return clearNonceCookie(
      NextResponse.redirect(new URL(await consumeOAuthReturnPath(), request.url))
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const name = error instanceof Error ? error.name : "Error";
    console.error(`BigCommerce OAuth callback error: [${name}] ${message}`);
    return clearNonceCookie(
      NextResponse.redirect(new URL("/?error=oauth_failed", request.url))
    );
  }
}
