import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateNonce, buildAuthUrl } from "@/lib/flipkart/oauth";
import { getUserSession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  // Check if user is logged in
  const session = await getUserSession();
  if (!session) {
    const redirectPath = "/api/auth/flipkart";
    return NextResponse.redirect(
      new URL(
        `/signin?redirect=${encodeURIComponent(redirectPath)}`,
        request.url
      )
    );
  }

  // Generate and store nonce for CSRF protection
  const nonce = generateNonce();
  const cookieStore = await cookies();
  cookieStore.set("flipkart_nonce", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  // Build OAuth URL and redirect
  const authUrl = buildAuthUrl(nonce);
  return NextResponse.redirect(authUrl);
}
