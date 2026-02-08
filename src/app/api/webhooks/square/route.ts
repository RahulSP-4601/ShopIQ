import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { SquareClient } from "@/lib/square/client";
import { getValidSquareToken } from "@/lib/square/token-refresh";
import { verifyWebhookSignature } from "@/lib/square/webhooks";
import { decryptToken } from "@/lib/shopify/oauth";
import { mapSquareOrderStatus } from "@/lib/sync/types";
import { sanitizeMarketplaceResponse } from "@/lib/sync/sanitize";

/**
 * Hash PII (e.g. email) with SHA-256 before persisting to rawData/DB.
 * Returns null if input is falsy.
 */
function hashPii(value: string | null | undefined): string | null {
  if (!value) return null;
  return crypto.createHash("sha256").update(value.toLowerCase().trim()).digest("hex");
}

const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "DJF", "GNF", "ISK", "JPY", "KMF", "KRW",
  "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);
const THREE_DECIMAL_CURRENCIES = new Set(["BHD", "KWD", "OMR"]);

function convertFromMinorUnits(amount: number, currency: string): number {
  const upper = currency.toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(upper)) return amount;
  if (THREE_DECIMAL_CURRENCIES.has(upper)) return amount / 1000;
  return amount / 100;
}

// Helper to convert typed object to Prisma Json (handles BigInt serialization)
function toJson<T>(data: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(data, (_key, value) => {
    if (typeof value === "bigint") return value.toString();
    return value;
  })) as Prisma.InputJsonValue;
}

/**
 * Square Webhook Handler
 *
 * Square sends webhooks with:
 * - x-square-hmacsha256-signature header for verification
 * - merchant_id in the payload for identification
 */

interface SquareWebhookPayload {
  merchant_id: string;
  type: string;
  event_id: string;
  created_at: string;
  data: {
    type: string;
    id: string;
    object?: Record<string, unknown>;
  };
}

export async function POST(request: NextRequest) {
  // Build notification URL for signature verification
  const appUrl = process.env.APP_URL;
  if (!appUrl && process.env.NODE_ENV === "production") {
    console.error("Square webhook: APP_URL not configured in production");
    return NextResponse.json(
      { error: "Webhook URL not configured" },
      { status: 500 }
    );
  }
  const notificationUrl = appUrl
    ? `${appUrl}/api/webhooks/square`
    : "http://localhost:3000/api/webhooks/square";

  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get("x-square-hmacsha256-signature");

    // Parse payload to get merchant ID
    let payload: SquareWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const { merchant_id: merchantId, type: eventType, data } = payload;

    if (!merchantId) {
      return NextResponse.json(
        { error: "Missing merchant_id" },
        { status: 400 }
      );
    }

    // Validate data and data.id before using
    if (!data || typeof data !== "object") {
      console.error("Square webhook: Missing or invalid 'data' field in payload");
      return NextResponse.json(
        { error: "Missing data field" },
        { status: 400 }
      );
    }

    if (!data.id || typeof data.id !== "string") {
      console.error(`Square webhook: Missing or invalid data.id for event type ${eventType}`);
      return NextResponse.json(
        { error: "Missing data.id" },
        { status: 400 }
      );
    }

    // Find connection by merchant ID
    const connection = await prisma.marketplaceConnection.findFirst({
      where: {
        marketplace: "SQUARE",
        externalId: merchantId,
        status: "CONNECTED",
      },
    });

    if (!connection) {
      console.error(
        `Square webhook: No connection found for merchant ${merchantId}`
      );
      return NextResponse.json(
        { error: "Merchant not found" },
        { status: 404 }
      );
    }

    // Verify webhook signature
    if (connection.webhookSecret) {
      if (!signature) {
        console.error("Square webhook: Missing signature header");
        return NextResponse.json(
          { error: "Missing signature" },
          { status: 401 }
        );
      }
      try {
        const signatureKey = decryptToken(connection.webhookSecret);
        if (
          !verifyWebhookSignature(rawBody, signature, signatureKey, notificationUrl)
        ) {
          console.error("Square webhook: Signature verification failed");
          return NextResponse.json(
            { error: "Invalid signature" },
            { status: 401 }
          );
        }
      } catch (decryptError) {
        // Sanitize error logging - don't expose decryption internals
        const message = decryptError instanceof Error ? decryptError.message : "Unknown error";
        console.error(`Square webhook: Failed to decrypt signature key - ${message}`);
        return NextResponse.json(
          { error: "Webhook signature verification failed" },
          { status: 500 }
        );
      }
    } else if (process.env.NODE_ENV === "production") {
      // In production, reject webhooks without a signature key configured
      console.error(
        `Square webhook: No webhookSecret configured for merchant ${merchantId} in production — rejecting`
      );
      return NextResponse.json(
        { error: "Webhook signature verification not configured" },
        { status: 401 }
      );
    } else {
      console.warn(
        "Square webhook: Skipping signature verification in development (no webhookSecret)"
      );
    }

    // Determine entity type and check if this is a known event type
    const isOrderEvent = eventType.startsWith("order.");
    const isCatalogEvent =
      eventType === "catalog.version.updated" ||
      eventType.startsWith("inventory.");

    // Skip unknown event types
    if (!isOrderEvent && !isCatalogEvent) {
      console.log(`Square webhook: Ignoring unknown event type ${eventType}`);
      return NextResponse.json({ received: true });
    }

    // Dedup: use Square's built-in event_id — reject if missing/empty
    const eventId = typeof payload.event_id === "string" ? payload.event_id.trim() : "";
    if (!eventId) {
      console.warn(`Square webhook: Missing or empty event_id for event type ${eventType}`);
      return NextResponse.json(
        { error: "Missing or empty event_id" },
        { status: 400 }
      );
    }

    try {
      await prisma.webhookEvent.create({
        data: {
          marketplace: "SQUARE",
          eventId,
          eventType: eventType,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json({ received: true, deduplicated: true });
      }
      throw error;
    }

    // Create sync log
    const syncLog = await prisma.unifiedSyncLog.create({
      data: {
        connectionId: connection.id,
        marketplace: "SQUARE",
        entity: isOrderEvent ? "orders" : "products",
        status: "started",
        trigger: "webhook",
      },
    });

    try {
      // Get valid token (auto-refreshes if needed)
      const accessToken = await getValidSquareToken(connection.userId);
      const client = new SquareClient(accessToken, false);

      let syncedCount = 0;

      // Route based on event type
      if (isOrderEvent) {
        syncedCount = await handleOrderWebhook(
          client,
          connection,
          data.id,
          eventType
        );
      } else if (isCatalogEvent) {
        syncedCount = await handleCatalogWebhook(connection);
      }

      // Update sync log with actual count
      await prisma.unifiedSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "completed",
          syncedCount,
          completedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true });
    } catch (handlerError) {
      // Update sync log with error — wrap in its own try/catch
      // to prevent a DB error from swallowing the original handlerError
      try {
        await prisma.unifiedSyncLog.update({
          where: { id: syncLog.id },
          data: {
            status: "failed",
            errorMessage:
              handlerError instanceof Error
                ? handlerError.message
                : "Unknown error",
            completedAt: new Date(),
          },
        });
      } catch (logUpdateError) {
        const logMsg = logUpdateError instanceof Error ? logUpdateError.message : "Unknown error";
        console.error(`Square webhook: Failed to update sync log ${syncLog.id}: ${logMsg}`);
      }
      throw handlerError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Square webhook error: ${message}`);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleOrderWebhook(
  client: SquareClient,
  connection: { id: string; userId: string; externalId: string | null },
  orderId: string,
  eventType: string
): Promise<number> {
  // Get locations for currency info — guard against null/undefined return
  const locations = (await client.listLocations()) ?? [];
  if (locations.length === 0) {
    console.warn(`Square webhook: No locations found for merchant — defaulting currency to USD`);
  }

  // Retrieve the specific order directly
  const order = await client.retrieveOrder(orderId);

  if (!order) {
    console.log(`Square webhook: Order ${orderId} not found`);
    return 0;
  }

  // Match order's location_id to the correct location for currency, fallback to first location then USD
  const matchedLocation = order.location_id && locations.length > 0
    ? locations.find((loc) => loc.id === order.location_id)
    : null;
  const storeCurrency = matchedLocation?.currency || locations[0]?.currency || "USD";

  // Get customer info from fulfillment if available
  const fulfillment = order.fulfillments?.[0];
  const recipient =
    fulfillment?.pickup_details?.recipient ||
    fulfillment?.shipment_details?.recipient;

  const customerName = recipient?.display_name || null;
  const customerEmail = hashPii(recipient?.email_address);

  // Convert from minor units using currency-aware conversion
  const orderCurrency = order.total_money?.currency || storeCurrency;
  const totalAmount = convertFromMinorUnits(order.total_money?.amount || 0, orderCurrency);

  // Validate closed_at before constructing Date (mirrors orderedAt pattern)
  const fulfilledAt = order.closed_at && !isNaN(Date.parse(order.closed_at))
    ? new Date(order.closed_at)
    : null;

  // Upsert unified order
  const unifiedOrder = await prisma.unifiedOrder.upsert({
    where: {
      connectionId_externalOrderId: {
        connectionId: connection.id,
        externalOrderId: orderId,
      },
    },
    create: {
      userId: connection.userId,
      marketplace: "SQUARE",
      connectionId: connection.id,
      externalOrderId: orderId,
      status: mapSquareOrderStatus(order.state),
      currency: order.total_money?.currency || storeCurrency,
      totalAmount,
      itemCount: order.line_items?.length || 0,
      customerName,
      customerEmail,
      orderedAt: order.created_at && !isNaN(Date.parse(order.created_at))
        ? new Date(order.created_at)
        : new Date(),
      fulfilledAt,
      rawData: toJson(sanitizeMarketplaceResponse(order)),
    },
    update: {
      status: mapSquareOrderStatus(order.state),
      totalAmount,
      itemCount: order.line_items?.length || 0,
      customerName,
      customerEmail,
      fulfilledAt,
      rawData: toJson(sanitizeMarketplaceResponse(order)),
      syncedAt: new Date(),
    },
  });

  // Replace order items atomically using a transaction
  // Only delete-and-recreate when line_items is present to avoid data loss
  if (order.line_items && order.line_items.length > 0) {
    await prisma.$transaction(async (tx) => {
      await tx.unifiedOrderItem.deleteMany({
        where: { orderId: unifiedOrder.id },
      });

      await tx.unifiedOrderItem.createMany({
        data: order.line_items!.map((item) => {
          // Safe parseInt with fallback
          const quantity = parseInt(item.quantity, 10);
          const safeQuantity = Number.isNaN(quantity) || quantity <= 0 ? 1 : quantity;
          const itemCurrency = item.total_money?.currency || storeCurrency;
          return {
            orderId: unifiedOrder.id,
            externalItemId: item.uid,
            title: item.name,
            sku: item.catalog_object_id || null,
            quantity: safeQuantity,
            unitPrice: convertFromMinorUnits(item.base_price_money?.amount || 0, itemCurrency),
            totalPrice: convertFromMinorUnits(item.total_money?.amount || 0, itemCurrency),
            currency: itemCurrency,
          };
        }),
      });
    });
  }

  return 1;
}

/**
 * Handle catalog/inventory webhook by scheduling background sync.
 *
 * Square's catalog.version.updated doesn't tell us which items changed,
 * so a full catalog re-sync is required. This is too heavy for an inline
 * webhook handler (many API calls, risk of serverless timeout).
 *
 * Instead, we reset lastSyncAt to null so the existing cron sync
 * (/api/cron/sync) picks up this connection for a full re-sync on
 * its next invocation.
 */
async function handleCatalogWebhook(
  connection: { id: string; userId: string; externalId: string | null }
): Promise<number> {
  await prisma.marketplaceConnection.update({
    where: { id: connection.id },
    data: { lastSyncAt: null },
  });

  console.log(
    `Square webhook: Catalog/inventory change detected for connection ${connection.id} — scheduled for background sync`
  );

  return 0;
}
