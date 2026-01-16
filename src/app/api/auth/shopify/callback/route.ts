import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import {
  validateHmac,
  validateShopDomain,
  exchangeCodeForToken,
} from "@/lib/shopify/oauth";
import { ShopifyClient } from "@/lib/shopify/client";
import { createSession } from "@/lib/auth/session";

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
  cookieStore.delete("shopify_nonce");

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
    // Exchange code for access token
    const { accessToken, scope } = await exchangeCodeForToken(shop, code);

    // Create a temporary store object to fetch shop info
    const tempStore = {
      id: "",
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

    const client = new ShopifyClient(tempStore);
    const shopInfo = await client.getShopInfo();

    // Create or update store in database
    const store = await prisma.store.upsert({
      where: { domain: shop },
      create: {
        shopifyId: String(shopInfo.id),
        domain: shop,
        name: shopInfo.name,
        email: shopInfo.email,
        currency: shopInfo.currency,
        timezone: shopInfo.iana_timezone || shopInfo.timezone,
        accessToken,
        scope,
        syncStatus: "PENDING",
      },
      update: {
        accessToken,
        scope,
        name: shopInfo.name,
        email: shopInfo.email,
        currency: shopInfo.currency,
        timezone: shopInfo.iana_timezone || shopInfo.timezone,
      },
    });

    // Create session
    await createSession({
      storeId: store.id,
      domain: store.domain,
    });

    // Redirect to sync page
    return NextResponse.redirect(new URL("/sync", request.url));
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/?error=oauth_failed", request.url)
    );
  }
}
