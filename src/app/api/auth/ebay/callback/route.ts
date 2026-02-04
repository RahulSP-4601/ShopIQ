import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { exchangeCodeForToken, encryptToken } from "@/lib/ebay/oauth";
import { EbayClient } from "@/lib/ebay/client";
import { getUserSession } from "@/lib/auth/session";

function clearNonceCookie(response: NextResponse): NextResponse {
  response.cookies.delete("ebay_nonce");
  return response;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // Validate required params
  if (!code || !state) {
    return clearNonceCookie(
      NextResponse.redirect(new URL("/?error=missing_params", request.url))
    );
  }

  // Validate state/nonce
  const cookieStore = await cookies();
  const storedNonce = cookieStore.get("ebay_nonce")?.value;

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
          "/signin?redirect=/onboarding/connect&ebay_restart=true",
          request.url
        )
      );
      clearNonceCookie(response);
      response.cookies.set("pending_ebay_connect", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 10,
        path: "/",
      });
      return response;
    }

    // Exchange code for tokens
    const { accessToken, refreshToken, expiresIn } =
      await exchangeCodeForToken(code);

    // Fetch user info using plaintext token
    const client = new EbayClient(accessToken, false);
    const userInfo = await client.getUserInfo();

    if (
      !userInfo?.userId ||
      typeof userInfo.userId !== "string" ||
      !userInfo?.username ||
      typeof userInfo.username !== "string"
    ) {
      console.error(
        "eBay OAuth callback: getUserInfo returned incomplete data",
        {
          hasUserId: !!userInfo?.userId,
          hasUsername: !!userInfo?.username,
        }
      );
      return clearNonceCookie(
        NextResponse.redirect(
          new URL("/?error=missing_user_info", request.url)
        )
      );
    }

    // Encrypt tokens before storing
    const encryptedAccessToken = encryptToken(accessToken);
    const encryptedRefreshToken = encryptToken(refreshToken);

    // Calculate token expiry (eBay access tokens last ~2 hours)
    const safeExpiresIn =
      typeof expiresIn === "number" && Number.isFinite(expiresIn) && expiresIn > 0
        ? expiresIn
        : 7200; // default 2 hours
    const tokenExpiry = new Date(Date.now() + safeExpiresIn * 1000);

    // Create or update marketplace connection
    await prisma.marketplaceConnection.upsert({
      where: {
        userId_marketplace: {
          userId: session.userId,
          marketplace: "EBAY",
        },
      },
      create: {
        userId: session.userId,
        marketplace: "EBAY",
        status: "CONNECTED",
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiry,
        externalId: userInfo.userId,
        externalName: userInfo.username,
        connectedAt: new Date(),
      },
      update: {
        status: "CONNECTED",
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiry,
        externalId: userInfo.userId,
        externalName: userInfo.username,
        connectedAt: new Date(),
      },
    });

    return clearNonceCookie(
      NextResponse.redirect(new URL("/onboarding/connect", request.url))
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const name = error instanceof Error ? error.name : "Error";
    console.error(`eBay OAuth callback error: [${name}] ${message}`);
    return clearNonceCookie(
      NextResponse.redirect(new URL("/?error=oauth_failed", request.url))
    );
  }
}
