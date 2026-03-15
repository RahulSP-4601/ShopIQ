import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateNonce, buildAuthUrl } from "@/lib/bigcommerce/oauth";

export async function GET() {
  try {
    // Generate nonce for CSRF protection
    const nonce = generateNonce();

    // Build BigCommerce OAuth URL
    const authUrl = buildAuthUrl(nonce);

    // Store nonce in cookie for validation
    const cookieStore = await cookies();
    cookieStore.set("bigcommerce_nonce", nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
      path: "/",
    });

    // Redirect to BigCommerce OAuth
    return NextResponse.redirect(authUrl);
  } catch (error) {
    // Sanitize error logging to avoid leaking sensitive data
    const message = error instanceof Error ? error.message : "Unknown error";
    const name = error instanceof Error ? error.name : "Error";
    console.error(`BigCommerce OAuth initiation error: [${name}] ${message}`);
    // Use server-only APP_URL for redirects (NEXT_PUBLIC_ vars are client-exposed)
    const appUrl = process.env.APP_URL?.replace(/\/+$/, "") || (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000");
    if (!appUrl) {
      console.error("BigCommerce OAuth error: APP_URL is required in production");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }
    return NextResponse.redirect(
      `${appUrl}/onboarding/connect?error=oauth_init_failed`
    );
  }
}
