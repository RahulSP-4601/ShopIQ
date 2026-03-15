/**
 * BigCommerce Sync Service
 *
 * Syncs orders and products from BigCommerce to unified tables.
 * BigCommerce has webhooks for real-time updates, but this service
 * handles initial sync and periodic reconciliation.
 */

import prisma from "@/lib/prisma";
import { MarketplaceConnection, Prisma } from "@prisma/client";
import { BigCommerceClient } from "@/lib/bigcommerce/client";
import {
  SyncResult,
  mapBigCommerceOrderStatus,
  mapBigCommerceProductStatus,
} from "./types";
import { sanitizeMarketplaceResponse } from "./sanitize";

/**
 * Safely convert a typed object to Prisma Json.
 * Handles BigInt values (converts to string) and circular references.
 */
function toJson<T>(data: T): Prisma.InputJsonValue {
  const seen = new WeakSet();
  try {
    const json = JSON.stringify(data, (_key, value) => {
      if (typeof value === "bigint") {
        return value.toString();
      }
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return "[Circular]";
        }
        seen.add(value);
      }
      return value;
    });
    return JSON.parse(json) as Prisma.InputJsonValue;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`toJson serialization failed: ${message}`);
    return { _serializationError: message } as Prisma.InputJsonValue;
  }
}

/** Safely parse a date string, returning null for falsy or unparsable values */
function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  const parsed = Date.parse(dateString);
  return isNaN(parsed) ? null : new Date(parsed);
}

/**
 * Sync BigCommerce orders to UnifiedOrder table
 */
export async function syncBigCommerceOrders(
  connection: MarketplaceConnection
): Promise<number> {
  if (!connection.accessToken || !connection.externalId) {
    throw new Error("BigCommerce connection missing credentials");
  }

  const client = new BigCommerceClient(
    connection.externalId,
    connection.accessToken,
    true
  );

  // Get store info for currency
  const storeInfo = await client.getStoreInfo();
  const storeCurrency = storeInfo?.currency || "USD";

  let synced = 0;
  let currentPage = 1;
  const pageSize = 50;

  // Create sync log
  const syncLog = await prisma.unifiedSyncLog.create({
    data: {
      connectionId: connection.id,
      marketplace: "BIGCOMMERCE",
      entity: "orders",
      status: "started",
      trigger: "cron",
    },
  });

  try {
    let hasMore = true;

    while (hasMore) {
      const orders = await client.getOrders({
        page: currentPage,
        limit: pageSize,
        min_date_modified: connection.lastSyncAt?.toISOString(),
      });

      if (orders.length === 0) {
        hasMore = false;
        continue;
      }

      // Batch-fetch order products for all orders on this page in parallel
      // (throttled via Promise.allSettled to avoid sequential N+1 calls)
      const orderProductsMap = new Map<number, Awaited<ReturnType<typeof client.getOrderProducts>>>();
      const failedOrderProductIds: number[] = [];
      const PRODUCTS_BATCH_SIZE = 5;
      for (let i = 0; i < orders.length; i += PRODUCTS_BATCH_SIZE) {
        const batch = orders.slice(i, i + PRODUCTS_BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((o) => client.getOrderProducts(o.id).then((products) => ({ id: o.id, products })))
        );
        for (let j = 0; j < results.length; j++) {
          const result = results[j];
          if (result.status === "fulfilled") {
            orderProductsMap.set(result.value.id, result.value.products);
          } else {
            const failedOrderId = batch[j].id;
            failedOrderProductIds.push(failedOrderId);
            console.warn(`BigCommerce sync: Failed to fetch order products for order ${failedOrderId}: ${result.reason}`);
          }
        }
      }

      // Retry once for failed order product fetches
      if (failedOrderProductIds.length > 0) {
        for (const orderId of failedOrderProductIds) {
          try {
            const products = await client.getOrderProducts(orderId);
            orderProductsMap.set(orderId, products);
          } catch (retryError) {
            const msg = retryError instanceof Error ? retryError.message : "Unknown error";
            console.error(`BigCommerce sync: Retry failed for order ${orderId} products: ${msg}`);
            // Continue without line items for this order — data will be incomplete but sync won't halt
          }
        }
      }

      for (const order of orders) {
        const orderProducts = orderProductsMap.get(order.id) || [];

        const customerName = order.billing_address
          ? `${order.billing_address.first_name} ${order.billing_address.last_name}`.trim()
          : null;

        // Parse order date with warning for bad data
        const parsedOrderDate = parseDate(order.date_created);
        if (!parsedOrderDate) {
          console.warn(
            `BigCommerce sync: Order ${order.id} has unparseable date_created: ${JSON.stringify(order.date_created)} — using current time as fallback`
          );
        }
        const orderedAt = parsedOrderDate ?? new Date();

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
              marketplace: "BIGCOMMERCE",
              connectionId: connection.id,
              externalOrderId: String(order.id),
              status: mapBigCommerceOrderStatus(order.status_id),
              currency: order.currency_code || storeCurrency,
              totalAmount: parseFloat(order.total_inc_tax) || 0,
              itemCount: order.items_total ?? orderProducts.length,
              customerName,
              customerEmail: order.billing_address?.email || null,
              orderedAt,
              fulfilledAt: parseDate(order.date_shipped),
              rawData: toJson(sanitizeMarketplaceResponse(order)),
            },
            update: {
              status: mapBigCommerceOrderStatus(order.status_id),
              totalAmount: parseFloat(order.total_inc_tax) || 0,
              itemCount: order.items_total ?? orderProducts.length,
              customerName,
              customerEmail: order.billing_address?.email || null,
              fulfilledAt: parseDate(order.date_shipped),
              rawData: toJson(sanitizeMarketplaceResponse(order)),
              syncedAt: new Date(),
            },
          });

          await tx.unifiedOrderItem.deleteMany({
            where: { orderId: unifiedOrder.id },
          });

          if (orderProducts.length > 0) {
            await tx.unifiedOrderItem.createMany({
              data: orderProducts.map((item) => ({
                orderId: unifiedOrder.id,
                externalItemId: String(item.id),
                title: item.name,
                sku: item.sku || null,
                quantity: item.quantity > 0 ? item.quantity : 1,
                unitPrice: parseFloat(item.price_inc_tax) || 0,
                totalPrice: parseFloat(item.total_inc_tax) || 0,
                currency: order.currency_code || storeCurrency,
              })),
            });
          }
        });

        synced++;
      }

      currentPage++;
      hasMore = orders.length === pageSize;
    }

    // Update sync log
    await prisma.unifiedSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "completed",
        syncedCount: synced,
        completedAt: new Date(),
      },
    });

    return synced;
  } catch (error) {
    // Update sync log with error — nested try-catch to avoid masking original error
    try {
      await prisma.unifiedSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date(),
        },
      });
    } catch (logError) {
      console.error("Failed to update sync log:", logError);
    }
    throw error;
  }
}

/**
 * Sync BigCommerce products to UnifiedProduct table
 */
export async function syncBigCommerceProducts(
  connection: MarketplaceConnection
): Promise<number> {
  if (!connection.accessToken || !connection.externalId) {
    throw new Error("BigCommerce connection missing credentials");
  }

  const client = new BigCommerceClient(
    connection.externalId,
    connection.accessToken,
    true
  );

  // Get store info for currency
  const storeInfo = await client.getStoreInfo();
  const storeCurrency = storeInfo?.currency || "USD";

  let synced = 0;
  let currentPage = 1;
  const pageSize = 50;

  // Create sync log
  const syncLog = await prisma.unifiedSyncLog.create({
    data: {
      connectionId: connection.id,
      marketplace: "BIGCOMMERCE",
      entity: "products",
      status: "started",
      trigger: "cron",
    },
  });

  try {
    let hasMore = true;

    while (hasMore) {
      const result = await client.getProducts({
        page: currentPage,
        limit: pageSize,
        include: "images",
      });

      if (result.data.length === 0) {
        hasMore = false;
        continue;
      }

      for (const product of result.data) {
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
              externalId: String(product.id),
            },
          },
          create: {
            userId: connection.userId,
            marketplace: "BIGCOMMERCE",
            connectionId: connection.id,
            externalId: String(product.id),
            title: product.name,
            sku: product.sku || null,
            category,
            price: product.price || 0,
            currency: storeCurrency,
            inventory: product.inventory_level || 0,
            status: mapBigCommerceProductStatus(
              product.is_visible,
              product.inventory_level
            ),
            imageUrl,
            rawData: toJson(sanitizeMarketplaceResponse(product)),
          },
          update: {
            title: product.name,
            sku: product.sku || null,
            category,
            price: product.price || 0,
            inventory: product.inventory_level || 0,
            status: mapBigCommerceProductStatus(
              product.is_visible,
              product.inventory_level
            ),
            imageUrl,
            rawData: toJson(sanitizeMarketplaceResponse(product)),
            syncedAt: new Date(),
          },
        });

        synced++;
      }

      currentPage++;
      const totalPages = result.meta?.pagination?.total_pages;
      hasMore = typeof totalPages === "number" && isFinite(totalPages)
        ? currentPage <= totalPages
        : false;
    }

    // Update sync log
    await prisma.unifiedSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "completed",
        syncedCount: synced,
        completedAt: new Date(),
      },
    });

    return synced;
  } catch (error) {
    // Update sync log with error — nested try-catch to avoid masking original error
    try {
      await prisma.unifiedSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date(),
        },
      });
    } catch (logError) {
      console.error("Failed to update sync log:", logError);
    }
    throw error;
  }
}

/**
 * Main sync function for BigCommerce
 */
export async function syncBigCommerce(
  connection: MarketplaceConnection
): Promise<SyncResult> {
  const errors: string[] = [];
  let ordersSynced = 0;
  let productsSynced = 0;
  let ordersSucceeded = false;
  let productsSucceeded = false;

  try {
    ordersSynced = await syncBigCommerceOrders(connection);
    ordersSucceeded = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    errors.push(`Orders: ${message}`);
    console.error("BigCommerce orders sync error:", error);
  }

  try {
    productsSynced = await syncBigCommerceProducts(connection);
    productsSucceeded = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    errors.push(`Products: ${message}`);
    console.error("BigCommerce products sync error:", error);
  }

  // Only update lastSyncAt when ALL syncs succeed to avoid skipping
  // partially-failed records on subsequent syncs
  if (ordersSucceeded && productsSucceeded) {
    try {
      await prisma.marketplaceConnection.update({
        where: { id: connection.id },
        data: { lastSyncAt: new Date() },
      });
    } catch (updateError) {
      const msg = updateError instanceof Error ? updateError.message : "Unknown error";
      console.error(`Failed to update lastSyncAt for BigCommerce connection ${connection.id}: ${msg}`);
      errors.push(`lastSyncAt update: ${msg}`);
    }
  }

  return { ordersSynced, productsSynced, errors };
}
