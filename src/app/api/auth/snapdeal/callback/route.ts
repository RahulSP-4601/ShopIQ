import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { encryptToken, getClientId, getAuthToken } from "@/lib/snapdeal/oauth";
import { SnapDealClient } from "@/lib/snapdeal/client";
import { getUserSession } from "@/lib/auth/session";

function clearNonceCookie(response: NextResponse): NextResponse {
  response.cookies.delete({ name: "snapdeal_nonce", path: "/" });
  return response;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // SnapDeal returns the seller token and state in the callback URL
  const sellerToken = searchParams.get("token") || searchParams.get("X-Seller-AuthZ-Token");
  const state = searchParams.get("state");

  // Validate required params
  if (!sellerToken || !state) {
    return clearNonceCookie(
      NextResponse.redirect(new URL("/?error=missing_params", request.url))
    );
  }

  // Validate state/nonce
  const cookieStore = await cookies();
  const storedNonce = cookieStore.get("snapdeal_nonce")?.value;

  if (!storedNonce || storedNonce !== state) {
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
          "/signin?redirect=/onboarding/connect&snapdeal_restart=true",
          request.url
        )
      );
      clearNonceCookie(response);
      response.cookies.set("pending_snapdeal_connect", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 10,
        path: "/",
      });
      return response;
    }

    // Fetch seller info using the plaintext token
    const clientId = getClientId();
    const authToken = getAuthToken();

    if (!clientId || !authToken) {
      const missing = [
        !clientId && "SNAPDEAL_CLIENT_ID",
        !authToken && "SNAPDEAL_AUTH_TOKEN",
      ].filter(Boolean).join(", ");
      console.error(
        `SnapDeal OAuth callback: Missing credentials: ${missing}`
      );
      return clearNonceCookie(
        NextResponse.redirect(
          new URL("/?error=server_misconfiguration", request.url)
        )
      );
    }

    const client = new SnapDealClient(sellerToken, clientId, authToken, false);
    const sellerInfo = await client.getSellerInfo();

    if (
      !sellerInfo?.sellerId ||
      typeof sellerInfo.sellerId !== "string" ||
      !sellerInfo?.sellerName ||
      typeof sellerInfo.sellerName !== "string"
    ) {
      console.error(
        "SnapDeal OAuth callback: getSellerInfo returned incomplete data",
        {
          hasSellerId: !!sellerInfo?.sellerId,
          hasSellerName: !!sellerInfo?.sellerName,
        }
      );
      return clearNonceCookie(
        NextResponse.redirect(
          new URL("/?error=missing_user_info", request.url)
        )
      );
    }

    // Encrypt token before storing
    const encryptedSellerToken = encryptToken(sellerToken);

    // Create or update marketplace connection
    // SnapDeal tokens don't expire in the typical OAuth sense — no tokenExpiry
    await prisma.marketplaceConnection.upsert({
      where: {
        userId_marketplace: {
          userId: session.userId,
          marketplace: "SNAPDEAL",
        },
      },
      create: {
        userId: session.userId,
        marketplace: "SNAPDEAL",
        status: "CONNECTED",
        accessToken: encryptedSellerToken,
        externalId: sellerInfo.sellerId,
        externalName: sellerInfo.sellerName,
        connectedAt: new Date(),
      },
      update: {
        status: "CONNECTED",
        accessToken: encryptedSellerToken,
        externalId: sellerInfo.sellerId,
        externalName: sellerInfo.sellerName,
        connectedAt: new Date(),
      },
    });

    // Note: Initial sync is handled by the scheduled cron job (/api/cron/sync)
    // to avoid serverless runtime timeouts. The connection is marked as CONNECTED
    // and will be picked up in the next sync cycle.

    return clearNonceCookie(
      NextResponse.redirect(new URL("/onboarding/connect", request.url))
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const name = error instanceof Error ? error.name : "Error";
    console.error(`SnapDeal OAuth callback error: [${name}] ${message}`);
    return clearNonceCookie(
      NextResponse.redirect(new URL("/?error=oauth_failed", request.url))
    );
  }
}
