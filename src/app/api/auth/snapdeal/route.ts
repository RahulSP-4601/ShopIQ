import { NextRequest, NextResponse } from "next/server";
import { generateNonce, buildAuthUrl } from "@/lib/snapdeal/oauth";
import { getUserSession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  // Check if user is logged in
  const session = await getUserSession();
  if (!session) {
    const redirectPath = "/api/auth/snapdeal";
    return NextResponse.redirect(
      new URL(
        `/signin?redirect=${encodeURIComponent(redirectPath)}`,
        request.url
      )
    );
  }

  // Generate nonce for CSRF protection
  const nonce = generateNonce();

  // Build auth URL and redirect, attaching nonce cookie to the response
  const authUrl = buildAuthUrl(nonce);
  const response = NextResponse.redirect(authUrl);
  response.cookies.set("snapdeal_nonce", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  return response;
}
