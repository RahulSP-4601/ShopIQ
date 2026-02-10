import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { verifyWebhookHmac } from "@/lib/shopify/webhooks";
import { ShopifyClient } from "@/lib/shopify/client";
import { mapShopifyOrderStatus } from "@/lib/sync/types";

/** Safely parse a float value, returning fallback if NaN */
function safeParseFloat(value: unknown, fallback = 0): number {
  const parsed = parseFloat(String(value ?? ""));
  return Number.isNaN(parsed) ? fallback : parsed;
}

/** Safely parse an integer value, returning fallback if NaN or non-positive */
function safeParseInt(value: unknown, fallback = 1): number {
  const parsed = parseInt(String(value ?? ""), 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

/** Safely parse a date string, returning null if invalid */
function safeParseDate(value: unknown): Date | null {
  if (!value || typeof value !== "string") return null;
  const parsed = Date.parse(value);
  return isNaN(parsed) ? null : new Date(parsed);
}

export async function POST(request: NextRequest) {
  // Read raw body first (before JSON parse) — critical for HMAC verification
  const rawBody = await request.text();
  const hmac = request.headers.get("X-Shopify-Hmac-Sha256");
  const topic = request.headers.get("X-Shopify-Topic");
  const shopDomain = request.headers.get("X-Shopify-Shop-Domain");

  // Verify HMAC signature
  if (!hmac || !verifyWebhookHmac(rawBody, hmac)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Always return 200 to prevent Shopify retry storms, even on processing errors
  try {
    if (!topic || !shopDomain) {
      console.error("Webhook missing topic or shop domain headers");
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Look up marketplace connection by domain (stored in externalName during OAuth)
    const connection = await prisma.marketplaceConnection.findFirst({
      where: {
        marketplace: "SHOPIFY",
        externalName: shopDomain,
        status: "CONNECTED",
      },
    });

    if (!connection) {
      console.error(`Webhook received for unknown Shopify store: ${shopDomain}`);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const data = JSON.parse(rawBody);

    // Dedup: check if this webhook was already processed (phase 1 — read-only check)
    const webhookId = request.headers.get("X-Shopify-Webhook-Id");
    if (webhookId) {
      const existing = await prisma.webhookEvent.findUnique({
        where: { marketplace_eventId: { marketplace: "SHOPIFY", eventId: webhookId } },
      });
      if (existing) {
        return NextResponse.json({ received: true, deduplicated: true }, { status: 200 });
      }
    }

    // Resolve currency: payload -> Shopify shop API -> "USD" fallback
    let resolvedCurrency = typeof data.currency === "string" ? data.currency : "";
    if (!resolvedCurrency && connection.accessToken && connection.externalName) {
      try {
        const client = new ShopifyClient(
          { domain: connection.externalName, accessToken: connection.accessToken }
        );
        const shopInfo = await client.getShopInfo();
        resolvedCurrency = shopInfo.currency || "";
      } catch {
        // Shopify API call failed — fall through to USD default
      }
    }
    const fallbackCurrency = resolvedCurrency || "USD";

    // Track whether a handler actually processed the webhook
    let handled = false;

    // Route to handler based on topic
    if (topic === "orders/create" || topic === "orders/updated") {
      await handleOrderWebhook(connection.userId, connection.id, fallbackCurrency, data);
      handled = true;
    } else if (topic === "products/create" || topic === "products/update") {
      await handleProductWebhook(connection.userId, connection.id, fallbackCurrency, data);
      handled = true;
    }

    // Phase 2: record dedup AFTER successful processing
    if (handled && webhookId) {
      try {
        await prisma.webhookEvent.create({
          data: {
            marketplace: "SHOPIFY",
            eventId: webhookId,
            eventType: topic,
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          // Another concurrent request already recorded it — harmless
        } else {
          const msg = error instanceof Error ? error.message : "Unknown error";
          console.error(`Shopify webhook: Failed to record dedup entry for ${webhookId}: ${msg}`);
        }
      }
    }

    // Only log as completed when a handler actually processed the webhook
    if (handled) {
      await prisma.unifiedSyncLog.create({
        data: {
          connectionId: connection.id,
          marketplace: "SHOPIFY",
          entity: topic.startsWith("orders") ? "orders" : "products",
          status: "completed",
          syncedCount: 1,
          trigger: "webhook",
          completedAt: new Date(),
        },
      });
    }
  } catch (error) {
    const errName = error instanceof Error ? error.name : "Error";
    const errMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Webhook processing error: [${errName}] ${errMessage}`);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

async function handleOrderWebhook(
  userId: string,
  connectionId: string,
  currency: string,
  order: Record<string, unknown>
): Promise<void> {
  if (order.id == null) {
    console.error("Shopify webhook: order.id is missing, skipping order processing");
    return;
  }
  const orderId = String(order.id);
  const fulfillmentStatus = (order.fulfillment_status as string | null) ?? null;
  const lineItems = (order.line_items as Array<Record<string, unknown>>) || [];

  const customer = order.customer as Record<string, unknown> | undefined;
  const firstName = (customer?.first_name as string) || "";
  const lastName = (customer?.last_name as string) || "";
  const fullName = `${firstName} ${lastName}`.trim();
  const customerName = fullName || (customer?.email as string) || null;
  const customerEmail = (customer?.email as string) || null;

  const fulfillments = (order.fulfillments as Array<Record<string, unknown>>) || [];
  const fulfilledAt = fulfillmentStatus === "fulfilled"
    ? (safeParseDate(fulfillments[0]?.created_at as string) ?? safeParseDate(order.updated_at as string))
    : null;

  const validItems = lineItems.filter((item) => item.id != null);

  const unifiedOrder = await prisma.unifiedOrder.upsert({
    where: {
      connectionId_externalOrderId: {
        connectionId,
        externalOrderId: orderId,
      },
    },
    create: {
      userId,
      marketplace: "SHOPIFY",
      connectionId,
      externalOrderId: orderId,
      status: mapShopifyOrderStatus(fulfillmentStatus),
      currency: (order.currency as string) || currency,
      totalAmount: safeParseFloat(order.total_price),
      itemCount: validItems.length,
      customerName,
      customerEmail,
      orderedAt: safeParseDate(order.created_at as string) ?? new Date(),
      fulfilledAt,
    },
    update: {
      status: mapShopifyOrderStatus(fulfillmentStatus),
      totalAmount: safeParseFloat(order.total_price),
      itemCount: validItems.length,
      customerName,
      customerEmail,
      fulfilledAt,
      syncedAt: new Date(),
    },
  });

  // Replace order items atomically using a transaction
  await prisma.$transaction(async (tx) => {
    await tx.unifiedOrderItem.deleteMany({
      where: { orderId: unifiedOrder.id },
    });
    if (validItems.length > 0) {
      await tx.unifiedOrderItem.createMany({
        data: validItems.map((item) => {
          const unitPrice = safeParseFloat(item.price);
          const qty = safeParseInt(item.quantity, 1);
          const discount = safeParseFloat(item.total_discount);
          return {
            orderId: unifiedOrder.id,
            externalItemId: String(item.id),
            title: (item.title as string) || "",
            sku: (item.sku as string) || null,
            quantity: qty,
            unitPrice,
            totalPrice: Math.max(0, unitPrice * qty - discount),
            currency: (order.currency as string) || currency,
          };
        }),
      });
    }
  });
}

async function handleProductWebhook(
  userId: string,
  connectionId: string,
  currency: string,
  product: Record<string, unknown>
): Promise<void> {
  if (product.id == null) {
    console.error("Shopify webhook: product.id is missing, skipping product processing");
    return;
  }
  const productId = String(product.id);
  const variants =
    (product.variants as Array<Record<string, unknown>>) || [];
  const images = (product.images as Array<Record<string, unknown>>) || [];
  const firstVariant = variants[0] as Record<string, unknown> | undefined;
  if (!firstVariant) {
    console.warn(`Shopify webhook: Product ${productId} has no variants — price will default to 0`);
  }
  const totalInventory = variants.reduce(
    (sum, v) => {
      const qty = Number(v.inventory_quantity);
      return sum + (isNaN(qty) ? 0 : qty);
    },
    0
  );

  await prisma.unifiedProduct.upsert({
    where: {
      connectionId_externalId: {
        connectionId,
        externalId: productId,
      },
    },
    create: {
      userId,
      marketplace: "SHOPIFY",
      connectionId,
      externalId: productId,
      title: (product.title as string) || "",
      sku: (firstVariant?.sku as string) || null,
      category: (product.product_type as string) || null,
      price: safeParseFloat(firstVariant?.price),
      currency,
      inventory: totalInventory,
      status: product.status === "active" ? "ACTIVE" : "INACTIVE",
      imageUrl: (images[0]?.src as string) || null,
    },
    update: {
      title: (product.title as string) || "",
      sku: (firstVariant?.sku as string) || null,
      category: (product.product_type as string) || null,
      price: safeParseFloat(firstVariant?.price),
      currency,
      inventory: totalInventory,
      status: product.status === "active" ? "ACTIVE" : "INACTIVE",
      imageUrl: (images[0]?.src as string) || null,
      syncedAt: new Date(),
    },
  });
}
