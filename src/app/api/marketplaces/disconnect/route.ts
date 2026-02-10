import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/auth/session";
import { MarketplaceType, Prisma } from "@prisma/client";
import { deregisterWebhooks as deregisterShopifyWebhooks } from "@/lib/shopify/webhooks";
import { BigCommerceClient } from "@/lib/bigcommerce/client";
import { deregisterWebhooks as deregisterBigCommerceWebhooks } from "@/lib/bigcommerce/webhooks";
import { SquareClient } from "@/lib/square/client";
import { deregisterWebhooks as deregisterSquareWebhooks } from "@/lib/square/webhooks";
import { decryptToken as decryptSquareToken } from "@/lib/square/oauth";

const disconnectSchema = z.object({
  marketplace: z.nativeEnum(MarketplaceType),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = disconnectSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { marketplace } = result.data;

    // First check if the connection exists
    const existingConnection = await prisma.marketplaceConnection.findUnique({
      where: {
        userId_marketplace: {
          userId: session.userId,
          marketplace,
        },
      },
    });

    if (!existingConnection) {
      return NextResponse.json(
        { error: "Marketplace connection not found" },
        { status: 404 }
      );
    }

    // Capture tokens/info BEFORE the transaction clears them, for webhook deregistration after
    const savedAccessToken = existingConnection.accessToken;
    const savedExternalId = existingConnection.externalId;
    const savedExternalName = existingConnection.externalName;

    // Use a transaction to ensure atomicity — clear tokens first
    const connection = await prisma.$transaction(async (tx) => {
      // Update connection status to disconnected
      const updatedConnection = await tx.marketplaceConnection.update({
        where: {
          userId_marketplace: {
            userId: session.userId,
            marketplace,
          },
        },
        data: {
          status: "DISCONNECTED",
          accessToken: null,
          refreshToken: null,
          tokenExpiry: null,
        },
      });

      return updatedConnection;
    });

    // Deregister webhooks AFTER the transaction commits so we don't
    // remove webhooks while the connection record still appears active.
    // If deregistration fails, the connection is already disconnected and
    // orphaned webhooks will be cleaned up on next connect.

    // Shopify webhook deregistration — use saved domain (externalName) and token
    if (marketplace === "SHOPIFY" && savedAccessToken && savedExternalName) {
      try {
        await deregisterShopifyWebhooks({
          domain: savedExternalName,
          accessToken: savedAccessToken,
        });
      } catch (webhookError) {
        const msg = webhookError instanceof Error ? webhookError.message : "Unknown error";
        console.error(`Failed to deregister Shopify webhooks: ${msg}`);
      }
    }

    // BigCommerce webhook deregistration
    if (
      marketplace === "BIGCOMMERCE" &&
      savedAccessToken &&
      savedExternalId
    ) {
      const appUrl = process.env.APP_URL;
      if (!appUrl) {
        console.error(
          "BigCommerce webhook deregistration skipped: APP_URL environment variable not set"
        );
      } else {
        try {
          const webhookUrl = `${appUrl}/api/webhooks/bigcommerce`;
          const client = new BigCommerceClient(
            savedExternalId,
            savedAccessToken
          );
          await deregisterBigCommerceWebhooks(client, webhookUrl);
        } catch (webhookError) {
          console.error("Failed to deregister BigCommerce webhooks:", webhookError);
        }
      }
    }

    // Square webhook deregistration
    if (marketplace === "SQUARE" && savedAccessToken) {
      const appUrl = process.env.APP_URL;
      if (!appUrl) {
        console.error(
          "Square webhook deregistration skipped: APP_URL environment variable not set"
        );
      } else {
        try {
          const webhookUrl = `${appUrl}/api/webhooks/square`;
          const decryptedToken = decryptSquareToken(savedAccessToken);
          if (!decryptedToken) {
            console.error("Square webhook deregistration skipped: Failed to decrypt access token");
          } else {
            const client = new SquareClient(decryptedToken, false);
            await deregisterSquareWebhooks(client, webhookUrl);
          }
        } catch (webhookError) {
          console.error("Failed to deregister Square webhooks:", webhookError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      connection,
    });
  } catch (error) {
    console.error("Disconnect marketplace error:", error);

    // Handle specific Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json(
          { error: "Marketplace connection not found" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to disconnect marketplace" },
      { status: 500 }
    );
  }
}
