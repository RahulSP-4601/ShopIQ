import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  generateNonce,
  generateCodeVerifier,
  generateCodeChallenge,
  buildAuthUrl,
} from "@/lib/square/oauth";

export async function GET() {
  try {
    // Generate nonce for CSRF protection
    const nonce = generateNonce();

    // Generate PKCE code verifier and challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Build Square OAuth URL with PKCE
    const authUrl = buildAuthUrl(nonce, codeChallenge);

    // Store nonce and code verifier in cookies for validation
    const cookieStore = await cookies();

    cookieStore.set("square_nonce", nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
      path: "/",
    });

    cookieStore.set("square_code_verifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
      path: "/",
    });

    // Redirect to Square OAuth
    return NextResponse.redirect(authUrl);
  } catch (error) {
    // Sanitize error logging to avoid leaking sensitive data
    const message = error instanceof Error ? error.message : "Unknown error";
    const name = error instanceof Error ? error.name : "Error";
    console.error(`Square OAuth initiation error: [${name}] ${message}`);
    // Use server-only APP_URL for redirects (NEXT_PUBLIC_ vars are client-exposed)
    const appUrl = process.env.APP_URL?.replace(/\/+$/, "") || (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000");
    if (!appUrl) {
      console.error("Square OAuth error: APP_URL is required in production");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }
    try {
      return NextResponse.redirect(
        `${appUrl}/onboarding/connect?error=oauth_init_failed`
      );
    } catch {
      return NextResponse.json(
        { error: "oauth_init_failed", detail: "redirect_failed" },
        { status: 400 }
      );
    }
  }
}
