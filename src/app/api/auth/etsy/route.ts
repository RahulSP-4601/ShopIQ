import { NextRequest, NextResponse } from "next/server";
import {
  generateNonce,
  generateCodeVerifier,
  generateCodeChallenge,
  buildAuthUrl,
} from "@/lib/etsy/oauth";
import { getUserSession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  // Check if user is logged in
  const session = await getUserSession();
  if (!session) {
    const redirectPath = "/api/auth/etsy";
    return NextResponse.redirect(
      new URL(
        `/signin?redirect=${encodeURIComponent(redirectPath)}`,
        request.url
      )
    );
  }

  // Generate nonce for CSRF protection
  const nonce = generateNonce();

  // Generate PKCE code verifier and challenge
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Build OAuth URL and redirect
  const authUrl = buildAuthUrl(nonce, codeChallenge);
  const response = NextResponse.redirect(authUrl);

  // Store nonce for CSRF validation in callback
  response.cookies.set("etsy_nonce", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  // Store code verifier for PKCE token exchange in callback
  response.cookies.set("etsy_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  return response;
}
