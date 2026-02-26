import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  generateNonce,
  buildAuthUrl,
  validateShopDomain,
} from "@/lib/shopify/oauth";
import { getUserSession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const shop = searchParams.get("shop");

  if (!shop) {
    return NextResponse.json(
      { error: "Missing shop parameter" },
      { status: 400 }
    );
  }

  if (!validateShopDomain(shop)) {
    return NextResponse.json(
      { error: "Invalid shop domain" },
      { status: 400 }
    );
  }

  // Check if user is logged in
  const session = await getUserSession();
  if (!session) {
    // Redirect to signin with the shop parameter
    // Encode the entire redirect path to prevent query param confusion
    const redirectPath = `/api/auth/shopify?shop=${encodeURIComponent(shop)}`;
    return NextResponse.redirect(
      new URL(`/signin?redirect=${encodeURIComponent(redirectPath)}`, request.url)
    );
  }

  // Generate and store nonce for CSRF protection
  const nonce = generateNonce();
  const cookieStore = await cookies();
  cookieStore.set("shopify_nonce", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  // Build OAuth URL and redirect
  const authUrl = buildAuthUrl(shop, nonce);
  return NextResponse.redirect(authUrl);
}
