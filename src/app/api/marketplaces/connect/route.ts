import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/auth/session";
import { MarketplaceType } from "@prisma/client";

const connectSchema = z.object({
  marketplace: z.nativeEnum(MarketplaceType),
  // For Shopify, we'll need the shop domain
  shopDomain: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = connectSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { marketplace, shopDomain } = result.data;

    // For Shopify, redirect to OAuth flow
    if (marketplace === "SHOPIFY") {
      if (!shopDomain) {
        return NextResponse.json(
          { error: "Shop domain is required for Shopify" },
          { status: 400 }
        );
      }

      // Normalize and validate shopDomain to prevent SSRF/redirect injection
      const normalizedDomain = shopDomain.trim().toLowerCase();

      // Validate Shopify domain pattern - must be a valid myshopify.com subdomain
      // Enforces: 3-63 chars, no leading/trailing hyphens, no consecutive hyphens
      // Regex breakdown: start with alphanumeric, 1-61 middle chars (alphanumeric or hyphen), end with alphanumeric
      // This gives us 1 + (1 to 61) + 1 = 3 to 63 character subdomains
      const shopifyDomainRegex = /^(?!.*--)(?!-)[a-z0-9][a-z0-9-]{1,61}[a-z0-9]\.myshopify\.com$/;
      if (!shopifyDomainRegex.test(normalizedDomain)) {
        return NextResponse.json(
          { error: "Invalid Shopify domain. Must be 3-63 characters, no leading/trailing hyphens, no consecutive hyphens." },
          { status: 400 }
        );
      }

      // Build OAuth URL safely using URL constructor
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const oauthUrl = new URL("/api/auth/shopify", appUrl);
      oauthUrl.searchParams.set("shop", normalizedDomain);

      return NextResponse.json({
        success: true,
        requiresOAuth: true,
        oauthUrl: oauthUrl.toString(),
      });
    }

    // For Flipkart, redirect to OAuth flow
    if (marketplace === "FLIPKART") {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const oauthUrl = new URL("/api/auth/flipkart", appUrl);

      return NextResponse.json({
        success: true,
        requiresOAuth: true,
        oauthUrl: oauthUrl.toString(),
      });
    }

    // For eBay, redirect to OAuth flow
    if (marketplace === "EBAY") {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const oauthUrl = new URL("/api/auth/ebay", appUrl);

      return NextResponse.json({
        success: true,
        requiresOAuth: true,
        oauthUrl: oauthUrl.toString(),
      });
    }

    // For other marketplaces, create a stub connection (simulating OAuth success)
    const marketplaceName = marketplace.replaceAll("_", " ");
    const connection = await prisma.marketplaceConnection.upsert({
      where: {
        userId_marketplace: {
          userId: session.userId,
          marketplace,
        },
      },
      create: {
        userId: session.userId,
        marketplace,
        status: "CONNECTED",
        connectedAt: new Date(),
        externalId: `stub-${marketplace.toLowerCase()}-${Date.now()}`,
        externalName: `My ${marketplaceName} Store`,
      },
      update: {
        // Preserve externalId on reconnection to avoid breaking external references
        status: "CONNECTED",
        connectedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      connection,
    });
  } catch (error) {
    console.error("Connect marketplace error:", error);
    return NextResponse.json(
      { error: "Failed to connect marketplace" },
      { status: 500 }
    );
  }
}
