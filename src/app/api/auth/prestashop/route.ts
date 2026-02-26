import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/auth/session";
import { PrestaShopClient } from "@/lib/prestashop/client";
import {
  normalizeStoreUrl,
  validateApiKey,
  encryptToken,
} from "@/lib/prestashop/types";

const connectSchema = z.object({
  storeUrl: z.string().min(1, "Store URL is required"),
  apiKey: z.string().min(1, "API key is required"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const result = connectSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const storeUrl = result.data.storeUrl;

    // Validate and normalize store URL (includes SSRF prevention)
    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeStoreUrl(storeUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid store URL";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // Validate API key format (returns trimmed key)
    let apiKey: string;
    try {
      apiKey = validateApiKey(result.data.apiKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid API key";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // Test connection with raw (unencrypted) key
    let shopName: string;
    try {
      const client = new PrestaShopClient(apiKey, normalizedUrl, false);
      const info = await client.getShopInfo();
      shopName = info.shopName;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connection failed";
      console.error(
        `PrestaShop auth: Connection test failed for ${normalizedUrl}:`,
        message
      );
      return NextResponse.json(
        {
          error:
            "Could not connect to your PrestaShop store. Please check your store URL and API key.",
        },
        { status: 400 }
      );
    }

    // Encrypt API key before storage (trimmed by validateApiKey)
    const encryptedApiKey = encryptToken(apiKey);

    // Upsert marketplace connection
    const connection = await prisma.marketplaceConnection.upsert({
      where: {
        userId_marketplace: {
          userId: session.userId,
          marketplace: "PRESTASHOP",
        },
      },
      create: {
        userId: session.userId,
        marketplace: "PRESTASHOP",
        accessToken: encryptedApiKey,
        externalId: normalizedUrl,
        externalName: shopName,
        status: "CONNECTED",
        connectedAt: new Date(),
      },
      update: {
        accessToken: encryptedApiKey,
        externalId: normalizedUrl,
        externalName: shopName,
        status: "CONNECTED",
        connectedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      connection: {
        id: connection.id,
        marketplace: connection.marketplace,
        status: connection.status,
        externalName: connection.externalName,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("PrestaShop auth error:", message);
    return NextResponse.json(
      { error: "Failed to connect PrestaShop store" },
      { status: 500 }
    );
  }
}
