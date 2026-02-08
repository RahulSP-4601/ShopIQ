import { MarketplaceConnection } from "@prisma/client";
import prisma from "@/lib/prisma";
import { EbayClient } from "@/lib/ebay/client";
import { getValidEbayToken } from "@/lib/ebay/token-refresh";
import { mapEbayOrderStatus, SyncResult } from "./types";

/**
 * Safely parse a float value, returning fallback if invalid
 */
function safeParseFloat(value: unknown, fallback: number = 0): number {
  if (value === null || value === undefined) return fallback;
  const parsed = parseFloat(String(value));
  return Number.isNaN(parsed) ? fallback : parsed;
}

export async function syncEbayOrders(
  connection: MarketplaceConnection
): Promise<number> {
  const accessToken = await getValidEbayToken(connection.userId);
  const client = new EbayClient(accessToken, false);
  let synced = 0;
  let offset = 0;
  const limit = 50;

  // Create sync log after successful token/client setup so it doesn't stay "started" on auth failure
  const syncLog = await prisma.unifiedSyncLog.create({
    data: {
      connectionId: connection.id,
      marketplace: "EBAY",
      entity: "orders",
      status: "started",
      trigger: "cron",
    },
  });

  try {
    let hasMore = true;
    while (hasMore) {
      const result = await client.getOrders({
        limit,
        offset,
        createdAfter: connection.lastSyncAt?.toISOString(),
      });

      const orders = result.orders ?? [];
      for (const order of orders) {
        if (!order.orderId || typeof order.orderId !== "string" || order.orderId.trim() === "") {
          console.warn(`eBay sync: Skipping order with missing/empty orderId [connectionId=${connection.id}]`);
          continue;
        }

        const totalAmount = safeParseFloat(order.pricingSummary?.total?.value);
        const currency = order.pricingSummary?.total?.currency || "USD";

        // Validate creationDate before using it
        let orderedAt: Date;
        if (order.creationDate && !isNaN(Date.parse(order.creationDate))) {
          orderedAt = new Date(order.creationDate);
        } else {
          console.warn(
            `eBay sync: Invalid/missing creationDate for order ${order.orderId} [connectionId=${connection.id}], falling back to current time`
          );
          orderedAt = new Date();
        }

        const unifiedOrder = await prisma.unifiedOrder.upsert({
          where: {
            connectionId_externalOrderId: {
              connectionId: connection.id,
              externalOrderId: order.orderId,
            },
          },
          create: {
            userId: connection.userId,
            marketplace: "EBAY",
            connectionId: connection.id,
            externalOrderId: order.orderId,
            status: mapEbayOrderStatus(order.orderFulfillmentStatus),
            currency,
            totalAmount,
            itemCount: order.lineItems?.length ?? 0,
            customerName: order.buyer?.username || null,
            orderedAt,
          },
          update: {
            status: mapEbayOrderStatus(order.orderFulfillmentStatus),
            totalAmount,
            itemCount: order.lineItems?.length ?? 0,
            syncedAt: new Date(),
          },
        });

        // Replace order items atomically using a transaction
        // Always delete existing items to handle item removal, even when lineItems is empty
        const lineItems = order.lineItems ?? [];
        const validLineItems = lineItems.filter((item) => {
          if (!item.lineItemId || typeof item.lineItemId !== "string" || item.lineItemId.trim() === "") {
            console.warn(
              `eBay sync: Skipping line item with missing/empty lineItemId in order ${order.orderId} [connectionId=${connection.id}]`
            );
            return false;
          }
          return true;
        });

        await prisma.$transaction(async (tx) => {
          await tx.unifiedOrderItem.deleteMany({
            where: { orderId: unifiedOrder.id },
          });

          if (validLineItems.length > 0) {
            await tx.unifiedOrderItem.createMany({
              data: validLineItems.map((item) => {
                const unitPrice = safeParseFloat(item.lineItemCost?.value);
                const itemCurrency = item.lineItemCost?.currency || currency;
                if (item.quantity == null || item.quantity <= 0) {
                  console.warn(
                    `eBay sync: Invalid quantity ${JSON.stringify(item.quantity)} for line item ${item.lineItemId} in order ${order.orderId} [connectionId=${connection.id}], defaulting to 1`
                  );
                }
                const safeQuantity = item.quantity != null && item.quantity > 0 ? item.quantity : 1;
                return {
                  orderId: unifiedOrder.id,
                  externalItemId: item.lineItemId,
                  title: item.title || "",
                  sku: item.sku || null,
                  quantity: safeQuantity,
                  unitPrice,
                  totalPrice: unitPrice * safeQuantity,
                  currency: itemCurrency,
                };
              }),
            });
          }
        });

        synced++;
      }

      offset += limit;
      hasMore = orders.length === limit;
    }

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
      console.error(`eBay syncOrders: Failed to update sync log ${syncLog.id}: ${logMsg}`);
    }
    throw error;
  }
}

export async function syncEbayProducts(
  connection: MarketplaceConnection
): Promise<number> {
  const accessToken = await getValidEbayToken(connection.userId);
  const client = new EbayClient(accessToken, false);
  let synced = 0;
  let offset = 0;
  const limit = 100;

  // Create sync log after successful token/client setup so it doesn't stay "started" on auth failure
  const syncLog = await prisma.unifiedSyncLog.create({
    data: {
      connectionId: connection.id,
      marketplace: "EBAY",
      entity: "products",
      status: "started",
      trigger: "cron",
    },
  });

  try {
    // Derive currency from existing synced orders for this connection.
    // eBay inventory API doesn't return currency, so we use the most recent order's currency.
    const recentOrder = await prisma.unifiedOrder.findFirst({
      where: { connectionId: connection.id, marketplace: "EBAY" },
      orderBy: { orderedAt: "desc" },
      select: { currency: true },
    });
    const productCurrency = recentOrder?.currency || "USD";
    if (!recentOrder) {
      console.warn(
        `eBay sync: No orders found for connection ${connection.id} to derive currency, defaulting to USD`
      );
    }

    let hasMore = true;
    while (hasMore) {
      const result = await client.getInventoryItems({ limit, offset });

      const inventoryItems = Array.isArray(result.inventoryItems) ? result.inventoryItems : [];
      if (!Array.isArray(result.inventoryItems)) {
        console.warn(
          `eBay sync: result.inventoryItems is not an array [connectionId=${connection.id}], skipping batch`
        );
      }
      for (const item of inventoryItems) {
        // Validate SKU: eBay uses SKU as the externalId, skip items without one
        if (!item.sku || typeof item.sku !== "string" || item.sku.trim() === "") {
          console.warn(`eBay sync: Skipping inventory item with missing/empty SKU [connectionId=${connection.id}]`);
          continue;
        }

        const qty = item.availability?.shipToLocationAvailability?.quantity ?? 0;

        // Defensive checks for item.product
        const product = item.product;
        const title = product?.title || "";
        const imageUrl = product?.imageUrls?.[0] || null;

        await prisma.unifiedProduct.upsert({
          where: {
            connectionId_externalId: {
              connectionId: connection.id,
              externalId: item.sku,
            },
          },
          create: {
            userId: connection.userId,
            marketplace: "EBAY",
            connectionId: connection.id,
            externalId: item.sku,
            title,
            sku: item.sku,
            price: 0, // eBay inventory API doesn't expose price directly
            currency: productCurrency,
            inventory: qty,
            status: qty > 0 ? "ACTIVE" : "OUT_OF_STOCK",
            imageUrl,
          },
          update: {
            title,
            inventory: qty,
            status: qty > 0 ? "ACTIVE" : "OUT_OF_STOCK",
            imageUrl,
            syncedAt: new Date(),
          },
        });

        synced++;
      }

      offset += limit;
      hasMore = inventoryItems.length === limit;
    }

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
      console.error(`eBay syncProducts: Failed to update sync log ${syncLog.id}: ${logMsg}`);
    }
    throw error;
  }
}

export async function syncEbay(
  connection: MarketplaceConnection
): Promise<SyncResult> {
  const errors: string[] = [];
  let ordersSynced = 0;
  let productsSynced = 0;
  let ordersSucceeded = false;
  let productsSucceeded = false;

  try {
    ordersSynced = await syncEbayOrders(connection);
    ordersSucceeded = true;
  } catch (error) {
    errors.push(`Orders: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  try {
    productsSynced = await syncEbayProducts(connection);
    productsSucceeded = true;
  } catch (error) {
    errors.push(`Products: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  // Only update lastSyncAt when BOTH syncs succeed to avoid skipping
  // partially-failed records on subsequent syncs
  if (ordersSucceeded && productsSucceeded) {
    await prisma.marketplaceConnection.update({
      where: { id: connection.id },
      data: { lastSyncAt: new Date() },
    });
  }

  return { ordersSynced, productsSynced, errors };
}
