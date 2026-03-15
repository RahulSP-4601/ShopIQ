import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { BigCommerceClient } from "@/lib/bigcommerce/client";
import {
  mapBigCommerceOrderStatus,
  mapBigCommerceProductStatus,
} from "@/lib/sync/types";
import { sanitizeMarketplaceResponse } from "@/lib/sync/sanitize";

// Helper to convert typed object to Prisma Json
function toJson<T>(data: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(data)) as Prisma.InputJsonValue;
}

/**
 * BigCommerce Webhook Handler
 *
 * BigCommerce sends webhooks with:
 * - X-BC-Store-Hash header for store identification
 * - scope: the webhook type (e.g., "store/order/created")
 * - data: { type, id } for the affected resource
 *
 * Security: BigCommerce does not provide HMAC signatures for webhooks.
 * Authentication relies on X-BC-Store-Hash header matching a known store,
 * combined with in-memory rate limiting per store hash. For production,
 * ensure webhooks are only received over HTTPS.
 */

interface BigCommerceWebhookPayload {
  scope: string;
  store_id: string;
  data: {
    type: string;
    id: number;
  };
  hash: string;
  created_at: number;
  producer: string;
}

// In-memory rate limiting per store hash (best-effort only — not shared across
// serverless instances). For true distributed rate limiting, use Redis/Upstash.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 120; // 120 requests per minute per store
const RATE_LIMIT_MAP_MAX_SIZE = 1000; // Cap to prevent unbounded growth

function evictStaleEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now >= entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}

function checkRateLimit(storeHash: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(storeHash);

  if (!entry || now >= entry.resetAt) {
    // Evict stale entries if map is at capacity
    if (!entry && rateLimitMap.size >= RATE_LIMIT_MAP_MAX_SIZE) {
      evictStaleEntries();
      // If still at capacity after eviction, reject to prevent bypass
      if (rateLimitMap.size >= RATE_LIMIT_MAP_MAX_SIZE) {
        return false;
      }
    }
    rateLimitMap.set(storeHash, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Get the store hash from header
    const storeHashHeader = request.headers.get("X-BC-Store-Hash");

    if (!storeHashHeader) {
      console.error("BigCommerce webhook: Missing X-BC-Store-Hash header");
      return NextResponse.json(
        { error: "Missing store hash header" },
        { status: 401 }
      );
    }

    // Rate limit per store hash to prevent abuse
    if (!checkRateLimit(storeHashHeader)) {
      console.warn(`BigCommerce webhook: Rate limit exceeded for store ${storeHashHeader}`);
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    // Parse webhook payload BEFORE database lookups to fail fast on malformed requests
    let payload: BigCommerceWebhookPayload;
    try {
      payload = await request.json();
    } catch {
      console.error("BigCommerce webhook: Failed to parse JSON payload");
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    // Validate required payload fields safely (guard against missing data object)
    const { scope, data } = payload;
    if (
      !scope ||
      typeof scope !== "string" ||
      !data ||
      typeof data !== "object" ||
      typeof data.id !== "number" ||
      typeof payload.created_at !== "number" ||
      !Number.isFinite(payload.created_at)
    ) {
      console.error("BigCommerce webhook: Invalid payload structure (missing scope, data.id, or created_at)");
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }

    // Find connection directly by store hash
    const connection = await prisma.marketplaceConnection.findFirst({
      where: {
        marketplace: "BIGCOMMERCE",
        status: "CONNECTED",
        externalId: storeHashHeader,
      },
    });

    if (!connection) {
      console.error(
        `BigCommerce webhook: No connection found for store ${storeHashHeader}`
      );
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 }
      );
    }

    // Validate webhook secret if stored on the connection (timing-safe comparison)
    // Secret is passed via custom header to avoid exposure in URL/logs
    if (connection.webhookSecret) {
      const providedSecret = request.headers.get("x-webhook-secret");
      if (!providedSecret) {
        console.error(`BigCommerce webhook: Missing x-webhook-secret header for store ${storeHashHeader}`);
        return NextResponse.json(
          { error: "Invalid webhook secret" },
          { status: 401 }
        );
      }
      // Hash both values to fixed-length SHA-256 digests (32 bytes each) so
      // timingSafeEqual never leaks secret length via early length-check exceptions
      const expectedDigest = crypto.createHash("sha256").update(connection.webhookSecret).digest();
      const providedDigest = crypto.createHash("sha256").update(providedSecret).digest();
      if (!crypto.timingSafeEqual(expectedDigest, providedDigest)) {
        console.error(`BigCommerce webhook: Webhook secret mismatch for store ${storeHashHeader}`);
        return NextResponse.json(
          { error: "Invalid webhook secret" },
          { status: 401 }
        );
      }
    }

    // Validate access token before proceeding
    if (!connection.accessToken) {
      console.error(
        `BigCommerce webhook: No access token for store ${storeHashHeader} - token may have been revoked`
      );
      return NextResponse.json(
        { error: "Access token missing or revoked" },
        { status: 401 }
      );
    }

    // Determine entity type from scope
    const isOrderScope = scope.startsWith("store/order/");
    const isProductScope = scope.startsWith("store/product/");

    // Reject unknown scopes early
    if (!isOrderScope && !isProductScope) {
      console.warn(`BigCommerce webhook: Unknown scope "${scope}" - ignoring`);
      return NextResponse.json(
        { error: "Unknown webhook scope", scope },
        { status: 400 }
      );
    }

    // Dedup: construct event ID from scope + resource ID + timestamp
    const eventId = `${scope}:${data.id}:${payload.created_at}`;
    try {
      await prisma.webhookEvent.create({
        data: {
          marketplace: "BIGCOMMERCE",
          eventId,
          eventType: scope,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json({ success: true, deduplicated: true });
      }
      throw error;
    }

    // Create sync log
    const syncLog = await prisma.unifiedSyncLog.create({
      data: {
        connectionId: connection.id,
        marketplace: "BIGCOMMERCE",
        entity: isOrderScope ? "orders" : "products",
        status: "started",
        trigger: "webhook",
      },
    });

    try {
      // Create client with validated token (already checked above)
      const client = new BigCommerceClient(
        connection.externalId!,
        connection.accessToken,
        true
      );

      // Route based on scope
      let syncedCount = 0;
      if (isOrderScope) {
        syncedCount = await handleOrderWebhook(client, connection, data.id, scope);
      } else if (isProductScope) {
        syncedCount = await handleProductWebhook(client, connection, data.id, scope);
      }

      // Update sync log — wrapped in try/catch so log failures don't cause a 500
      try {
        await prisma.unifiedSyncLog.update({
          where: { id: syncLog.id },
          data: {
            status: "completed",
            syncedCount,
            completedAt: new Date(),
          },
        });
      } catch (logUpdateError) {
        const logMsg = logUpdateError instanceof Error ? logUpdateError.message : "Unknown error";
        console.error(`BigCommerce webhook: Failed to update sync log ${syncLog.id} on success: ${logMsg}`);
      }

      return NextResponse.json({ success: true });
    } catch (handlerError) {
      // Update sync log with error — wrap to prevent DB errors from swallowing the original error
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
        console.error(`BigCommerce webhook: Failed to update sync log ${syncLog.id}: ${logMsg}`);
      }
      throw handlerError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`BigCommerce webhook error: ${message}`);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleOrderWebhook(
  client: BigCommerceClient,
  connection: { id: string; userId: string; externalId: string | null },
  orderId: number,
  _scope: string
): Promise<number> {
  // Get store info for currency
  const storeInfo = await client.getStoreInfo();
  const storeCurrency = storeInfo?.currency || "USD";

  // Fetch the specific order directly by ID
  const order = await client.getOrder(orderId);

  if (!order) {
    console.log(`BigCommerce webhook: Order ${orderId} not found (may be deleted)`);
    return 0;
  }

  // Fetch order products
  const orderProducts = await client.getOrderProducts(orderId);

  const customerName = order.billing_address
    ? `${order.billing_address.first_name} ${order.billing_address.last_name}`.trim()
    : null;

  // Upsert unified order
  const unifiedOrder = await prisma.unifiedOrder.upsert({
    where: {
      connectionId_externalOrderId: {
        connectionId: connection.id,
        externalOrderId: String(orderId),
      },
    },
    create: {
      userId: connection.userId,
      marketplace: "BIGCOMMERCE",
      connectionId: connection.id,
      externalOrderId: String(orderId),
      status: mapBigCommerceOrderStatus(order.status_id),
      currency: order.currency_code || storeCurrency,
      totalAmount: parseFloat(order.total_inc_tax) || 0,
      itemCount: order.items_total ?? orderProducts.length,
      customerName,
      customerEmail: order.billing_address?.email || null,
      orderedAt: order.date_created && !isNaN(Date.parse(order.date_created))
        ? new Date(order.date_created)
        : new Date(),
      fulfilledAt:
        order.date_shipped && !isNaN(Date.parse(order.date_shipped))
          ? new Date(order.date_shipped)
          : null,
      rawData: toJson(sanitizeMarketplaceResponse(order)),
    },
    update: {
      status: mapBigCommerceOrderStatus(order.status_id),
      totalAmount: parseFloat(order.total_inc_tax) || 0,
      itemCount: order.items_total ?? orderProducts.length,
      customerName,
      customerEmail: order.billing_address?.email || null,
      fulfilledAt:
        order.date_shipped && !isNaN(Date.parse(order.date_shipped))
          ? new Date(order.date_shipped)
          : null,
      rawData: toJson(sanitizeMarketplaceResponse(order)),
      syncedAt: new Date(),
    },
  });

  // Replace order items atomically using a transaction
  // Always delete existing items first to handle item removal
  await prisma.$transaction(async (tx) => {
    await tx.unifiedOrderItem.deleteMany({
      where: { orderId: unifiedOrder.id },
    });

    if (orderProducts.length > 0) {
      await tx.unifiedOrderItem.createMany({
        data: orderProducts.map((item) => {
          if (item.quantity <= 0) {
            console.warn(
              `BigCommerce webhook: Order item ${item.id} has invalid quantity ${item.quantity}, defaulting to 1`
            );
          }
          return {
            orderId: unifiedOrder.id,
            externalItemId: String(item.id),
            title: item.name,
            sku: item.sku || null,
            quantity: item.quantity > 0 ? item.quantity : 1,
            unitPrice: parseFloat(item.price_inc_tax) || 0,
            totalPrice: parseFloat(item.total_inc_tax) || 0,
            currency: order.currency_code || storeCurrency,
          };
        }),
      });
    }
  });

  return 1;
}

async function handleProductWebhook(
  client: BigCommerceClient,
  connection: { id: string; userId: string; externalId: string | null },
  productId: number,
  scope: string
): Promise<number> {
  // Check if this is a delete
  if (scope === "store/product/deleted") {
    // Mark product as inactive
    await prisma.unifiedProduct.updateMany({
      where: {
        marketplace: "BIGCOMMERCE",
        connectionId: connection.id,
        externalId: String(productId),
      },
      data: {
        status: "INACTIVE",
        syncedAt: new Date(),
      },
    });
    return 1;
  }

  // Get store info for currency
  const storeInfo = await client.getStoreInfo();
  const storeCurrency = storeInfo?.currency || "USD";

  // Fetch the specific product directly by ID
  const product = await client.getProduct(productId, { include: "images" });

  if (!product) {
    console.log(`BigCommerce webhook: Product ${productId} not found - marking as inactive`);
    // Mark product as inactive if not found
    await prisma.unifiedProduct.updateMany({
      where: {
        marketplace: "BIGCOMMERCE",
        connectionId: connection.id,
        externalId: String(productId),
      },
      data: {
        status: "INACTIVE",
        syncedAt: new Date(),
      },
    });
    return 0;
  }

  // Get first image URL
  const imageUrl = product.images?.[0]?.url_standard || null;

  // Get category (first category ID)
  const category = product.categories?.[0]
    ? `Category ${product.categories[0]}`
    : null;

  await prisma.unifiedProduct.upsert({
    where: {
      connectionId_externalId: {
        connectionId: connection.id,
        externalId: String(productId),
      },
    },
    create: {
      userId: connection.userId,
      marketplace: "BIGCOMMERCE",
      connectionId: connection.id,
      externalId: String(productId),
      title: product.name,
      sku: product.sku || null,
      category,
      price: product.price || 0,
      currency: storeCurrency,
      inventory: product.inventory_level || 0,
      status: mapBigCommerceProductStatus(product.is_visible, product.inventory_level),
      imageUrl,
      rawData: toJson(sanitizeMarketplaceResponse(product)),
    },
    update: {
      title: product.name,
      sku: product.sku || null,
      category,
      price: product.price || 0,
      inventory: product.inventory_level || 0,
      status: mapBigCommerceProductStatus(product.is_visible, product.inventory_level),
      imageUrl,
      rawData: toJson(sanitizeMarketplaceResponse(product)),
      syncedAt: new Date(),
    },
  });

  return 1;
}
