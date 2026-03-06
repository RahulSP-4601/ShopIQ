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
  if (!connection.accessToken) {
    throw new Error("syncShopifyOrders: connection has no access token");
  }
  if (!connection.externalName) {
    throw new Error("syncShopifyOrders: connection.externalName (domain) is missing");
  }

  const client = new ShopifyClient({
    domain: connection.externalName,
    accessToken: connection.accessToken,
  });

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
  if (!connection.accessToken) {
    throw new Error("syncShopifyProducts: connection has no access token");
  }
  if (!connection.externalName) {
    throw new Error("syncShopifyProducts: connection.externalName (domain) is missing");
  }

  const client = new ShopifyClient({
    domain: connection.externalName,
    accessToken: connection.accessToken,
  });

  let pageInfo: string | undefined;
  let synced = 0;

  // Fetch the shop's currency once — Shopify products inherit the shop currency.
  // If the API call fails or returns no currency, abort the sync rather than silently writing incorrect "USD".
  let shopCurrency: string;
  try {
    const shopInfo = await client.getShopInfo();
    if (!shopInfo.currency) {
      throw new Error("Shopify API returned empty or missing currency for this shop");
    }
    shopCurrency = shopInfo.currency;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    throw new Error(`Failed to fetch shop currency — cannot sync products without accurate currency: ${msg}`);
  }

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
            currency: shopCurrency,
            inventory: totalInventory,
            status: product.status === "active" ? "ACTIVE" : "INACTIVE",
            imageUrl,
          },
          update: {
            title: product.title,
            sku: firstVariant?.sku || null,
            category: product.product_type || null,
            price: parseFloat(firstVariant?.price || "0"),
            currency: shopCurrency,
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
  // Use atomic CAS on syncInProgress + syncLockVersion to prevent concurrent syncs.
  // Also release stale locks older than 30 minutes (or with null syncStartedAt).
  const STALE_LOCK_THRESHOLD_MS = 30 * 60 * 1000;
  const staleThreshold = new Date(Date.now() - STALE_LOCK_THRESHOLD_MS);
  const now = new Date();

  // Read current lock version for optimistic locking
  const conn = await prisma.marketplaceConnection.findUnique({
    where: { id: connection.id },
    select: { syncLockVersion: true },
  });
  const currentVersion = conn?.syncLockVersion ?? 0;
  let acquiredVersion = currentVersion + 1;

  // First, try to claim a free lock (atomic version-check + increment)
  let claim = await prisma.marketplaceConnection.updateMany({
    where: { id: connection.id, syncInProgress: false, syncLockVersion: currentVersion },
    data: {
      syncInProgress: true,
      syncStartedAt: now,
      lastSyncAttemptAt: now,
      syncLockVersion: acquiredVersion,
    },
  });

  // If the lock is held, check if it's stale (including null syncStartedAt)
  if (claim.count === 0) {
    // Re-read version in case it changed since our first read
    const freshConn = await prisma.marketplaceConnection.findUnique({
      where: { id: connection.id },
      select: { syncLockVersion: true },
    });
    const freshVersion = freshConn?.syncLockVersion ?? 0;
    acquiredVersion = freshVersion + 1;

    claim = await prisma.marketplaceConnection.updateMany({
      where: {
        id: connection.id,
        syncInProgress: true,
        syncLockVersion: freshVersion,
        OR: [
          { syncStartedAt: { lt: staleThreshold } },
          { syncStartedAt: null },
        ],
      },
      data: {
        syncInProgress: true,
        syncStartedAt: now,
        lastSyncAttemptAt: now,
        syncLockVersion: acquiredVersion,
      },
    });

    if (claim.count > 0) {
      console.warn(`Shopify sync: Released stale lock for connection ${connection.id}`);
    }
  }

  // If stale-lock reclaim also failed, the lock holder may have released between our
  // first attempt and now. Retry the free-lock claim once before giving up.
  if (claim.count === 0) {
    const retryConn = await prisma.marketplaceConnection.findUnique({
      where: { id: connection.id },
      select: { syncLockVersion: true },
    });
    const retryVersion = retryConn?.syncLockVersion ?? 0;
    acquiredVersion = retryVersion + 1;

    claim = await prisma.marketplaceConnection.updateMany({
      where: { id: connection.id, syncInProgress: false, syncLockVersion: retryVersion },
      data: {
        syncInProgress: true,
        syncStartedAt: now,
        lastSyncAttemptAt: now,
        syncLockVersion: acquiredVersion,
      },
    });
  }

  if (claim.count === 0) {
    return {
      ordersSynced: 0,
      productsSynced: 0,
      errors: ["Skipped: Shopify sync is currently in progress"],
    };
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
    // Release the sync lock — only if our version still matches (prevents releasing another process's lock)
    try {
      const released = await prisma.marketplaceConnection.updateMany({
        where: { id: connection.id, syncLockVersion: acquiredVersion },
        data: { syncInProgress: false, syncStartedAt: null },
      });
      if (released.count === 0) {
        console.warn(`Shopify sync: Lock for connection ${connection.id} was reclaimed by another process, skipping release`);
      }
    } catch (resetError) {
      const msg = resetError instanceof Error ? resetError.message : "Unknown error";
      console.error(`Failed to release sync lock for connection ${connection.id}: ${msg}`);
    }
  }

  return { ordersSynced, productsSynced, errors };
}
