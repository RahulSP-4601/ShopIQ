import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import {
  validateHmac,
  validateShopDomain,
  exchangeCodeForToken,
  encryptToken,
} from "@/lib/shopify/oauth";
import { ShopifyClient } from "@/lib/shopify/client";
import { getUserSession } from "@/lib/auth/session";
import { registerWebhooks } from "@/lib/shopify/webhooks";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const shop = searchParams.get("shop");
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // Validate required params
  if (!shop || !code || !state) {
    return NextResponse.redirect(
      new URL("/?error=missing_params", request.url)
    );
  }

  // Validate shop domain
  if (!validateShopDomain(shop)) {
    return NextResponse.redirect(
      new URL("/?error=invalid_shop", request.url)
    );
  }

  // Validate state/nonce
  const cookieStore = await cookies();
  const storedNonce = cookieStore.get("shopify_nonce")?.value;
  // Must specify path to match how cookie was set in /api/auth/shopify
  cookieStore.delete({ name: "shopify_nonce", path: "/" });

  if (!storedNonce || storedNonce !== state) {
    return NextResponse.redirect(
      new URL("/?error=invalid_state", request.url)
    );
  }

  // Validate HMAC
  const queryParams: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  if (!validateHmac(queryParams)) {
    return NextResponse.redirect(
      new URL("/?error=invalid_hmac", request.url)
    );
  }

  try {
    // Check if user is logged in
    const session = await getUserSession();
    if (!session) {
      // User must be authenticated before OAuth flow
      // Store only the shop domain (not the code) so they can restart after login
      // Reuse cookieStore from above instead of redeclaring
      cookieStore.set("pending_shopify_shop", shop, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 10, // 10 minutes
        path: "/",
      });
      // Do NOT store the OAuth code - it's a one-time use token and storing it is insecure
      // User will need to restart the OAuth flow after signing in
      return NextResponse.redirect(
        new URL("/signin?redirect=/onboarding/connect&shopify_restart=true", request.url)
      );
    }

    // Exchange code for access token
    const { accessToken, scope } = await exchangeCodeForToken(shop, code);

    // Create a temporary store object to fetch shop info
    const tempStore = {
      id: "",
      userId: session.userId,
      domain: shop,
      accessToken,
      shopifyId: "",
      name: "",
      email: null,
      currency: "USD",
      timezone: "UTC",
      scope,
      syncStatus: "PENDING" as const,
      lastSyncedAt: null,
      ordersCount: 0,
      productsCount: 0,
      customersCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Pass isEncrypted=false since tempStore has plaintext token (not from database)
    const client = new ShopifyClient(tempStore, false);
    const shopInfo = await client.getShopInfo();

    // Encrypt access token before storing for security
    // Must be done before any database writes to avoid plaintext storage
    const encryptedAccessToken = encryptToken(accessToken);

    // Create or update store in database with encrypted token
    const store = await prisma.store.upsert({
      where: { domain: shop },
      create: {
        userId: session.userId,
        shopifyId: String(shopInfo.id),
        domain: shop,
        name: shopInfo.name,
        email: shopInfo.email,
        currency: shopInfo.currency,
        timezone: shopInfo.iana_timezone || shopInfo.timezone,
        accessToken: encryptedAccessToken,
        scope,
        syncStatus: "PENDING",
      },
      update: {
        userId: session.userId,
        accessToken: encryptedAccessToken,
        scope,
        name: shopInfo.name,
        email: shopInfo.email,
        currency: shopInfo.currency,
        timezone: shopInfo.iana_timezone || shopInfo.timezone,
      },
    });

    // Create or update marketplace connection
    await prisma.marketplaceConnection.upsert({
      where: {
        userId_marketplace: {
          userId: session.userId,
          marketplace: "SHOPIFY",
        },
      },
      create: {
        userId: session.userId,
        marketplace: "SHOPIFY",
        status: "CONNECTED",
        accessToken: encryptedAccessToken,
        externalId: String(shopInfo.id),
        externalName: shopInfo.name,
        connectedAt: new Date(),
      },
      update: {
        status: "CONNECTED",
        accessToken: encryptedAccessToken,
        externalId: String(shopInfo.id),
        externalName: shopInfo.name,
        connectedAt: new Date(),
      },
    });

    // Register Shopify webhooks for real-time order/product updates
    // Blocking call, but wrapped in try/catch so failure doesn't break the OAuth flow
    try {
      await registerWebhooks(store);
    } catch (webhookError) {
      // Sanitize error logging to avoid leaking sensitive data
      const msg = webhookError instanceof Error ? webhookError.message : "Unknown error";
      console.error(`Failed to register Shopify webhooks: ${msg}`);
    }

    // Note: Initial sync is handled by the scheduled cron job (/api/cron/sync)
    // to avoid serverless runtime timeouts. The connection is marked as CONNECTED
    // and will be picked up in the next sync cycle.

    // Redirect back to onboarding connect page to allow connecting more marketplaces
    return NextResponse.redirect(new URL("/onboarding/connect", request.url));
  } catch (error) {
    // Sanitize error logging to avoid leaking sensitive data
    const message = error instanceof Error ? error.message : "Unknown error";
    const name = error instanceof Error ? error.name : "Error";
    console.error(`Shopify OAuth callback error: [${name}] ${message}`);
    return NextResponse.redirect(
      new URL("/?error=oauth_failed", request.url)
    );
  }
}
