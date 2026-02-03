import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { exchangeCodeForToken, encryptToken } from "@/lib/flipkart/oauth";
import { FlipkartClient } from "@/lib/flipkart/client";
import { getUserSession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // Validate required params
  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/?error=missing_params", request.url)
    );
  }

  // Validate state/nonce
  const cookieStore = await cookies();
  const storedNonce = cookieStore.get("flipkart_nonce")?.value;
  cookieStore.delete("flipkart_nonce");

  if (!storedNonce || storedNonce !== state) {
    return NextResponse.redirect(
      new URL("/?error=invalid_state", request.url)
    );
  }

  try {
    // Check if user is logged in
    const session = await getUserSession();
    if (!session) {
      // Store a flag so the user can restart OAuth after signing in
      cookieStore.set("pending_flipkart_connect", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 10,
        path: "/",
      });
      return NextResponse.redirect(
        new URL(
          "/signin?redirect=/onboarding/connect&flipkart_restart=true",
          request.url
        )
      );
    }

    // Exchange code for tokens
    const { accessToken, refreshToken, expiresIn } =
      await exchangeCodeForToken(code);

    // Fetch seller info using plaintext token
    const client = new FlipkartClient(accessToken, false);
    const sellerInfo = await client.getSellerInfo();

    // Encrypt tokens before storing
    const encryptedAccessToken = encryptToken(accessToken);
    const encryptedRefreshToken = encryptToken(refreshToken);

    // Calculate token expiry
    const tokenExpiry = new Date(Date.now() + expiresIn * 1000);

    // Create or update marketplace connection
    await prisma.marketplaceConnection.upsert({
      where: {
        userId_marketplace: {
          userId: session.userId,
          marketplace: "FLIPKART",
        },
      },
      create: {
        userId: session.userId,
        marketplace: "FLIPKART",
        status: "CONNECTED",
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiry,
        externalId: sellerInfo.sellerId,
        externalName: sellerInfo.sellerName,
        connectedAt: new Date(),
      },
      update: {
        status: "CONNECTED",
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiry,
        externalId: sellerInfo.sellerId,
        externalName: sellerInfo.sellerName,
        connectedAt: new Date(),
      },
    });

    return NextResponse.redirect(new URL("/onboarding/connect", request.url));
  } catch (error) {
    console.error("Flipkart OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/?error=oauth_failed", request.url)
    );
  }
}
