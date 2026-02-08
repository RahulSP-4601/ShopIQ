import { MarketplaceConnection } from "@prisma/client";
import prisma from "@/lib/prisma";
import { ShopifyClient } from "@/lib/shopify/client";
import { mapShopifyOrderStatus, SyncResult } from "./types";

/**
 * Build customer name from first_name and last_name fields
 */
function buildCustomerName(customer: { first_name?: string; last_name?: string } | null | undefined): string | null {
  if (!customer) return null;
  const parts = [customer.first_name, customer.last_name]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

/**
 * Extract the fulfillment timestamp from the fulfillments array.
 * Returns the created_at of the first fulfillment, or null if none exist.
 */
function getFulfilledAt(
  fulfillmentStatus: string | null,
  fulfillments?: Array<{ created_at: string }> | null
): Date | null {
  if (fulfillmentStatus !== "fulfilled") return null;
  const ts = fulfillments?.[0]?.created_at;
  if (ts && !isNaN(Date.parse(ts))) {
    return new Date(ts);
  }
  return null;
}

export async function syncShopifyOrders(
  connection: MarketplaceConnection
): Promise<number> {
  // Validate externalId before using it
  if (!connection.externalId) {
    throw new Error("syncShopifyOrders: connection.externalId is missing");
  }

  const store = await prisma.store.findFirst({
    where: { userId: connection.userId, shopifyId: connection.externalId },
  });

  if (!store || !store.accessToken) {
    throw new Error("Shopify store not found or no access token");
  }

  const client = new ShopifyClient(store);
  let pageInfo: string | undefined;
  let synced = 0;

  const syncLog = await prisma.unifiedSyncLog.create({
    data: {
      connectionId: connection.id,
      marketplace: "SHOPIFY",
      entity: "orders",
      status: "started",
      trigger: "cron",
    },
  });

  try {
    do {
      const { orders, nextPageInfo } = await client.getOrders({
        limit: 250,
        page_info: pageInfo,
        updated_at_min: connection.lastSyncAt ?? undefined,
      });

      for (const order of orders) {
        // Use first_name and last_name for customerName, not email
        const customerName = buildCustomerName(order.customer);
        const fulfilledAt = getFulfilledAt(order.fulfillment_status, order.fulfillments);

        // Filter out items with invalid quantity before upsert so itemCount is consistent
        const validItems = order.line_items.filter((item) => {
          if (typeof item.quantity !== "number" || !Number.isFinite(item.quantity) || item.quantity <= 0) {
            console.warn(
              `Shopify sync: Order ${order.id} item ${item.id} has invalid quantity ${JSON.stringify(item.quantity)}, skipping`
            );
            return false;
          }
          return true;
        });

        // Upsert order and replace items atomically in a single transaction
        await prisma.$transaction(async (tx) => {
          const unifiedOrder = await tx.unifiedOrder.upsert({
            where: {
              connectionId_externalOrderId: {
                connectionId: connection.id,
                externalOrderId: String(order.id),
              },
            },
            create: {
              userId: connection.userId,
              marketplace: "SHOPIFY",
              connectionId: connection.id,
              externalOrderId: String(order.id),
              status: mapShopifyOrderStatus(order.fulfillment_status),
              currency: order.currency,
              totalAmount: parseFloat(order.total_price) || 0,
              itemCount: validItems.length,
              customerName,
              customerEmail: order.customer?.email ?? null,
              orderedAt: (() => {
                if (order.created_at && !isNaN(Date.parse(order.created_at))) {
                  return new Date(order.created_at);
                }
                console.warn(
                  `Shopify sync: Order ${order.id} has invalid/missing created_at "${order.created_at}", falling back to current time`
                );
                return new Date();
              })(),
              fulfilledAt,
            },
            update: {
              status: mapShopifyOrderStatus(order.fulfillment_status),
              totalAmount: parseFloat(order.total_price) || 0,
              itemCount: validItems.length,
              customerName,
              customerEmail: order.customer?.email ?? null,
              fulfilledAt,
              syncedAt: new Date(),
            },
          });

          await tx.unifiedOrderItem.deleteMany({
            where: { orderId: unifiedOrder.id },
          });

          if (validItems.length > 0) {
            await tx.unifiedOrderItem.createMany({
              data: validItems.map((item) => {
                const unitPrice = Math.round((parseFloat(item.price) || 0) * 100) / 100;
                const totalPrice = Math.round(unitPrice * item.quantity * 100) / 100;
                return {
                  orderId: unifiedOrder.id,
                  externalItemId: String(item.id),
                  title: item.title,
                  sku: item.sku || null,
                  quantity: item.quantity,
                  unitPrice,
                  totalPrice,
                  currency: order.currency,
                };
              }),
            });
          }
        });

        synced++;
      }

      pageInfo = nextPageInfo;
    } while (pageInfo);

    await prisma.unifiedSyncLog.update({
      where: { id: syncLog.id },
      data: { status: "completed", syncedCount: synced, completedAt: new Date() },
    });

    return synced;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    try {
      await prisma.unifiedSyncLog.update({
        where: { id: syncLog.id },
        data: { status: "failed", errorMessage: message, completedAt: new Date() },
      });
    } catch (logUpdateError) {
      const logMsg = logUpdateError instanceof Error ? logUpdateError.message : "Unknown error";
      console.error(`Shopify syncOrders: Failed to update sync log ${syncLog.id}: ${logMsg}`);
    }
    throw error;
  }
}

export async function syncShopifyProducts(
  connection: MarketplaceConnection
): Promise<number> {
  // Validate externalId before using it
  if (!connection.externalId) {
    throw new Error("syncShopifyProducts: connection.externalId is missing");
  }

  const store = await prisma.store.findFirst({
    where: { userId: connection.userId, shopifyId: connection.externalId },
  });

  if (!store || !store.accessToken) {
    throw new Error("Shopify store not found or no access token");
  }

  const client = new ShopifyClient(store);
  const storeCurrency = store.currency;
  if (!storeCurrency) {
    console.warn(
      `Shopify sync: store ${store.id} has no currency configured — defaulting to "USD". ` +
      `This may cause incorrect product pricing data.`
    );
  }

  let pageInfo: string | undefined;
  let synced = 0;

  const syncLog = await prisma.unifiedSyncLog.create({
    data: {
      connectionId: connection.id,
      marketplace: "SHOPIFY",
      entity: "products",
      status: "started",
      trigger: "cron",
    },
  });

  try {
    do {
      const { products, nextPageInfo } = await client.getProducts({
        limit: 250,
        page_info: pageInfo,
      });

      for (const product of products) {
        const variants = product.variants || [];
        const firstVariant = variants[0];
        const totalInventory = variants.reduce(
          (sum, v) => sum + (v.inventory_quantity || 0),
          0
        );

        const imageUrl = product.images?.[0]?.src || null;

        await prisma.unifiedProduct.upsert({
          where: {
            connectionId_externalId: {
              connectionId: connection.id,
              externalId: String(product.id),
            },
          },
          create: {
            userId: connection.userId,
            marketplace: "SHOPIFY",
            connectionId: connection.id,
            externalId: String(product.id),
            title: product.title,
            sku: firstVariant?.sku || null,
            category: product.product_type || null,
            price: parseFloat(firstVariant?.price || "0"),
            currency: storeCurrency || "USD",
            inventory: totalInventory,
            status: product.status === "active" ? "ACTIVE" : "INACTIVE",
            imageUrl,
          },
          update: {
            title: product.title,
            sku: firstVariant?.sku || null,
            category: product.product_type || null,
            price: parseFloat(firstVariant?.price || "0"),
            inventory: totalInventory,
            status: product.status === "active" ? "ACTIVE" : "INACTIVE",
            imageUrl,
            syncedAt: new Date(),
          },
        });

        synced++;
      }

      pageInfo = nextPageInfo;
    } while (pageInfo);

    await prisma.unifiedSyncLog.update({
      where: { id: syncLog.id },
      data: { status: "completed", syncedCount: synced, completedAt: new Date() },
    });

    return synced;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    try {
      await prisma.unifiedSyncLog.update({
        where: { id: syncLog.id },
        data: { status: "failed", errorMessage: message, completedAt: new Date() },
      });
    } catch (logUpdateError) {
      const logMsg = logUpdateError instanceof Error ? logUpdateError.message : "Unknown error";
      console.error(`Shopify syncProducts: Failed to update sync log ${syncLog.id}: ${logMsg}`);
    }
    throw error;
  }
}

export async function syncShopify(
  connection: MarketplaceConnection
): Promise<SyncResult> {
  // Guard: skip unified sync when legacy sync is explicitly enabled via feature flag.
  // Mutual exclusion ensures only one pipeline writes at a time.
  if (process.env.SHOPIFY_LEGACY_SYNC_ENABLED === "true") {
    console.log(
      `[UNIFIED_SYNC] Unified Shopify sync skipped — SHOPIFY_LEGACY_SYNC_ENABLED=true. ` +
      `Set to 'false' to enable the unified pipeline for connection ${connection.id}.`
    );
    return {
      ordersSynced: 0,
      productsSynced: 0,
      errors: ["Skipped: legacy sync is enabled (SHOPIFY_LEGACY_SYNC_ENABLED=true)"],
    };
  }

  // Guard: abort if the legacy Shopify sync is currently running for this store.
  // Uses atomic updateMany as a compare-and-swap to claim the sync slot, preventing
  // the TOCTOU race that exists with a separate findFirst + act pattern.
  let claimedSyncLock = false;
  if (connection.externalId) {
    const claim = await prisma.store.updateMany({
      where: {
        userId: connection.userId,
        shopifyId: connection.externalId,
        syncStatus: { not: "SYNCING" },
      },
      data: { syncStatus: "SYNCING" },
    });
    if (claim.count === 0) {
      // Either the store doesn't exist or a sync is already in progress
      const storeExists = await prisma.store.findFirst({
        where: { userId: connection.userId, shopifyId: connection.externalId },
        select: { id: true },
      });
      if (storeExists) {
        return {
          ordersSynced: 0,
          productsSynced: 0,
          errors: ["Skipped: Shopify sync is currently in progress for this store"],
        };
      }
      // Store doesn't exist — proceed (syncShopifyOrders will throw if store is needed)
    } else {
      claimedSyncLock = true;
    }
  }

  const errors: string[] = [];
  let ordersSynced = 0;
  let productsSynced = 0;
  let ordersSucceeded = false;
  let productsSucceeded = false;

  try {
    try {
      ordersSynced = await syncShopifyOrders(connection);
      ordersSucceeded = true;
    } catch (error) {
      errors.push(`Orders: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    try {
      productsSynced = await syncShopifyProducts(connection);
      productsSucceeded = true;
    } catch (error) {
      errors.push(`Products: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    // Only update lastSyncAt when both syncs succeed to avoid skipping
    // partially-failed records on subsequent syncs
    if (ordersSucceeded && productsSucceeded) {
      try {
        await prisma.marketplaceConnection.update({
          where: { id: connection.id },
          data: { lastSyncAt: new Date() },
        });
      } catch (updateError) {
        const msg = updateError instanceof Error ? updateError.message : "Unknown error";
        console.error(`Failed to update lastSyncAt for connection ${connection.id}: ${msg}`);
        errors.push(`lastSyncAt update: ${msg}`);
      }
    }
  } finally {
    // Release the sync lock so future syncs can proceed
    if (claimedSyncLock && connection.externalId) {
      try {
        await prisma.store.updateMany({
          where: {
            userId: connection.userId,
            shopifyId: connection.externalId,
          },
          data: {
            syncStatus: ordersSucceeded && productsSucceeded ? "COMPLETED" : "FAILED",
          },
        });
      } catch (resetError) {
        const msg = resetError instanceof Error ? resetError.message : "Unknown error";
        console.error(`Failed to reset syncStatus for store: ${msg}`);
      }
    }
  }

  return { ordersSynced, productsSynced, errors };
}
