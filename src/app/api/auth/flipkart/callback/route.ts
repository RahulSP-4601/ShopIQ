import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { exchangeCodeForToken, encryptToken } from "@/lib/flipkart/oauth";
import { FlipkartClient } from "@/lib/flipkart/client";
import { getUserSession } from "@/lib/auth/session";
import { consumeOAuthReturnPath } from "@/lib/auth/oauth-return";

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
  // Must specify path to match how cookie was set in /api/auth/flipkart
  cookieStore.delete({ name: "flipkart_nonce", path: "/" });

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

    // Note: Initial sync is handled by the scheduled cron job (/api/cron/sync)
    // to avoid serverless runtime timeouts. The connection is marked as CONNECTED
    // and will be picked up in the next sync cycle.

    const returnPath = await consumeOAuthReturnPath();
    return NextResponse.redirect(new URL(returnPath, request.url));
  } catch (error) {
    // Log safe, actionable context — redact URLs/tokens from message
    const name = error instanceof Error ? error.name : "Error";
    const rawMessage = error instanceof Error ? error.message : "";
    // Reusable helper to strip sensitive data from arbitrary text.
    // Truncates the raw input BEFORE redaction so markers are never split.
    function redactSensitiveText(text: string, maxLength: number): string {
      const truncated = text.slice(0, maxLength);
      return truncated
        .replace(/https?:\/\/[^\s]+/g, "[URL_REDACTED]")
        .replace(/eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, "[JWT_REDACTED]")
        .replace(/(?:token|key|secret|password|auth|access_token|refresh_token|api_key|client_secret)[=:]\s*['"]?[^\s'"&,]{8,}/gi, "[CREDENTIAL_REDACTED]")
        .replace(/\b[a-f0-9]{40,}\b/gi, "[HEX_REDACTED]");
    }
    const safeMessage = redactSensitiveText(rawMessage, 200);
    const safeStack = error instanceof Error && error.stack
      ? redactSensitiveText(error.stack.split("\n").slice(0, 3).join(" | "), 300)
      : "";
    console.error(
      `Flipkart OAuth callback failed: [${name}] ${safeMessage}${safeStack ? ` | Stack: ${safeStack}` : ""}`
    );
    // TODO: Forward full error to Sentry/observability with automatic PII redaction:
    // Sentry.captureException(error, { tags: { marketplace: "flipkart", flow: "oauth_callback" } });
    return NextResponse.redirect(
      new URL("/?error=oauth_failed", request.url)
    );
  }
}
