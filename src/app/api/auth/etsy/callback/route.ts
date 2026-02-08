import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { exchangeCodeForToken, encryptToken } from "@/lib/etsy/oauth";
import { EtsyClient } from "@/lib/etsy/client";
import { getUserSession } from "@/lib/auth/session";

function clearEtsyCookies(response: NextResponse): NextResponse {
  // Must specify path to match how cookies were set in /api/auth/etsy
  response.cookies.delete({ name: "etsy_nonce", path: "/" });
  response.cookies.delete({ name: "etsy_code_verifier", path: "/" });
  return response;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // Validate required params
  if (!code || !state) {
    return clearEtsyCookies(
      NextResponse.redirect(new URL("/?error=missing_params", request.url))
    );
  }

  // Validate state/nonce
  const cookieStore = await cookies();
  const storedNonce = cookieStore.get("etsy_nonce")?.value;

  if (!storedNonce || storedNonce !== state) {
    return clearEtsyCookies(
      NextResponse.redirect(new URL("/?error=invalid_state", request.url))
    );
  }

  // Retrieve PKCE code verifier
  const codeVerifier = cookieStore.get("etsy_code_verifier")?.value;

  if (!codeVerifier) {
    return clearEtsyCookies(
      NextResponse.redirect(new URL("/?error=missing_verifier", request.url))
    );
  }

  try {
    // Check if user is logged in
    const session = await getUserSession();
    if (!session) {
      const response = NextResponse.redirect(
        new URL(
          "/signin?redirect=/onboarding/connect&etsy_restart=true",
          request.url
        )
      );
      clearEtsyCookies(response);
      response.cookies.set("pending_etsy_connect", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 10,
        path: "/",
      });
      return response;
    }

    // Exchange code for tokens using PKCE code verifier
    const { accessToken, refreshToken, expiresIn } =
      await exchangeCodeForToken(code, codeVerifier);

    // Fetch user info using plaintext token
    const client = new EtsyClient(accessToken, false);
    const userInfo = await client.getUserInfo();

    if (
      !userInfo?.userId ||
      typeof userInfo.userId !== "number" ||
      !userInfo?.loginName ||
      typeof userInfo.loginName !== "string"
    ) {
      console.error(
        "Etsy OAuth callback: getUserInfo returned incomplete data",
        {
          hasUserId: !!userInfo?.userId,
          hasLoginName: !!userInfo?.loginName,
        }
      );
      return clearEtsyCookies(
        NextResponse.redirect(
          new URL("/?error=missing_user_info", request.url)
        )
      );
    }

    // Encrypt tokens before storing
    const encryptedAccessToken = encryptToken(accessToken);
    const encryptedRefreshToken = encryptToken(refreshToken);

    // Calculate token expiry (Etsy access tokens last ~1 hour)
    const safeExpiresIn =
      typeof expiresIn === "number" && Number.isFinite(expiresIn) && expiresIn > 0
        ? expiresIn
        : 3600; // default 1 hour
    const tokenExpiry = new Date(Date.now() + safeExpiresIn * 1000);

    // Create or update marketplace connection
    const connection = await prisma.marketplaceConnection.upsert({
      where: {
        userId_marketplace: {
          userId: session.userId,
          marketplace: "ETSY",
        },
      },
      create: {
        userId: session.userId,
        marketplace: "ETSY",
        status: "CONNECTED",
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiry,
        externalId: String(userInfo.userId),
        externalName: userInfo.loginName,
        connectedAt: new Date(),
      },
      update: {
        status: "CONNECTED",
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiry,
        externalId: String(userInfo.userId),
        externalName: userInfo.loginName,
        connectedAt: new Date(),
      },
    });

    // Note: Initial sync is handled by the scheduled cron job (/api/cron/sync)
    // to avoid serverless runtime timeouts. The connection is marked as CONNECTED
    // and will be picked up in the next sync cycle.

    return clearEtsyCookies(
      NextResponse.redirect(new URL("/onboarding/connect", request.url))
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const name = error instanceof Error ? error.name : "Error";
    console.error(`Etsy OAuth callback error: [${name}] ${message}`);
    return clearEtsyCookies(
      NextResponse.redirect(new URL("/?error=oauth_failed", request.url))
    );
  }
}
