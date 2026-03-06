import { MarketplaceConnection } from "@prisma/client";
import prisma from "@/lib/prisma";
import { SnapDealClient } from "@/lib/snapdeal/client";
import { getClientId, getAuthToken } from "@/lib/snapdeal/oauth";
import { mapSnapDealOrderStatus, mapSnapDealProductStatus, SyncResult } from "./types";

/**
 * Safely parse a float value, returning fallback if invalid
 */
function safeParseFloat(value: unknown, fallback: number = 0): number {
  if (value === null || value === undefined) return fallback;
  const parsed = parseFloat(String(value));
  return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * Create a SnapDeal client from a marketplace connection.
 * SnapDeal tokens don't expire, so no refresh logic needed.
 */
function createClient(connection: MarketplaceConnection): SnapDealClient {
  if (!connection.accessToken) {
    throw new Error("No SnapDeal access token found");
  }

  const clientId = getClientId();
  const authToken = getAuthToken();

  // accessToken is encrypted in DB — SnapDealClient decrypts it
  return new SnapDealClient(connection.accessToken, clientId, authToken);
}

export async function syncSnapDealOrders(
  connection: MarketplaceConnection
): Promise<number> {
  const client = createClient(connection);
  let synced = 0;

  const syncLog = await prisma.unifiedSyncLog.create({
    data: {
      connectionId: connection.id,
      marketplace: "SNAPDEAL",
      entity: "orders",
      status: "started",
      trigger: "cron",
    },
  });

  try {
    // Fetch both new and completed orders
    for (const fetchFn of [
      client.getNewOrders.bind(client),
      client.getCompletedOrders.bind(client),
    ]) {
      let pageNumber = 1;
      const pageSize = 50;
      let hasMore = true;

      while (hasMore) {
        const result = await fetchFn({ pageSize, pageNumber });

        const orders = result.orders ?? [];
        for (const order of orders) {
          // Use subOrderId as the unique identifier (more granular than orderId)
          const externalOrderId = order.subOrderId || order.orderId;
          if (
            !externalOrderId ||
            typeof externalOrderId !== "string" ||
            externalOrderId.trim() === ""
          ) {
            console.warn(
              `SnapDeal sync: Skipping order with missing/empty orderId [connectionId=${connection.id}]`
            );
            continue;
          }

          const totalAmount =
            safeParseFloat(order.price) + safeParseFloat(order.shippingCharge);
          const currency = order.currency || "INR";

          // Validate createdDate
          let orderedAt: Date;
          if (order.createdDate && !isNaN(Date.parse(order.createdDate))) {
            orderedAt = new Date(order.createdDate);
          } else {
            console.warn(
              `SnapDeal sync: Invalid/missing createdDate for order ${externalOrderId} [connectionId=${connection.id}], falling back to current time`
            );
            orderedAt = new Date();
          }

          // Upsert order and replace items atomically in a single transaction
          await prisma.$transaction(async (tx) => {
            const unifiedOrder = await tx.unifiedOrder.upsert({
              where: {
                connectionId_externalOrderId: {
                  connectionId: connection.id,
                  externalOrderId,
                },
              },
              create: {
                userId: connection.userId,
                marketplace: "SNAPDEAL",
                connectionId: connection.id,
                externalOrderId,
                status: mapSnapDealOrderStatus(order.status),
                currency,
                totalAmount,
                itemCount: order.quantity ?? 1,
                customerName: order.buyerName || null,
                orderedAt,
              },
              update: {
                status: mapSnapDealOrderStatus(order.status),
                totalAmount,
                itemCount: order.quantity ?? 1,
                syncedAt: new Date(),
              },
            });

            // Each SnapDeal order response is already at the sub-order (line item) level
            await tx.unifiedOrderItem.deleteMany({
              where: { orderId: unifiedOrder.id },
            });

            const unitPrice = safeParseFloat(order.price);
            const safeQuantity =
              order.quantity != null && order.quantity > 0
                ? order.quantity
                : 1;

            await tx.unifiedOrderItem.createMany({
              data: [
                {
                  orderId: unifiedOrder.id,
                  externalItemId: externalOrderId,
                  title: order.productTitle || "",
                  sku: order.sku || null,
                  quantity: safeQuantity,
                  unitPrice,
                  totalPrice: unitPrice * safeQuantity,
                  currency,
                },
              ],
            });
          });

          synced++;
        }

        pageNumber++;
        hasMore = orders.length === pageSize;
      }
    }

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
    const message = error instanceof Error ? error.message : "Unknown error";
    try {
      await prisma.unifiedSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "failed",
          syncedCount: synced,
          errorMessage: message,
          completedAt: new Date(),
        },
      });
    } catch (logUpdateError) {
      const logMsg =
        logUpdateError instanceof Error
          ? logUpdateError.message
          : "Unknown error";
      console.error(
        `SnapDeal syncOrders: Failed to update sync log ${syncLog.id} (partial syncedCount=${synced}): ${logMsg}`
      );
    }
    throw error;
  }
}

export async function syncSnapDealProducts(
  connection: MarketplaceConnection
): Promise<number> {
  const client = createClient(connection);
  let synced = 0;

  const syncLog = await prisma.unifiedSyncLog.create({
    data: {
      connectionId: connection.id,
      marketplace: "SNAPDEAL",
      entity: "products",
      status: "started",
      trigger: "cron",
    },
  });

  try {
    let pageNumber = 1;
    const pageSize = 50;
    let hasMore = true;

    while (hasMore) {
      const result = await client.getProducts({ pageSize, pageNumber });

      const products = result.products ?? [];
      for (const product of products) {
        // SUPC is the unique product identifier on SnapDeal
        const externalId = product.supc;
        if (
          !externalId ||
          typeof externalId !== "string" ||
          externalId.trim() === ""
        ) {
          console.warn(
            `SnapDeal sync: Skipping product with missing/empty SUPC [connectionId=${connection.id}]`
          );
          continue;
        }

        const price = safeParseFloat(product.sellingPrice);
        const currency = product.currency || "INR";
        const inventory = product.inventory ?? 0;

        await prisma.unifiedProduct.upsert({
          where: {
            connectionId_externalId: {
              connectionId: connection.id,
              externalId,
            },
          },
          create: {
            userId: connection.userId,
            marketplace: "SNAPDEAL",
            connectionId: connection.id,
            externalId,
            title: product.title || "",
            sku: product.sku || null,
            category: product.category || null,
            price,
            currency,
            inventory,
            status: mapSnapDealProductStatus(product.status, inventory),
            imageUrl: product.imageUrl || null,
          },
          update: {
            title: product.title || "",
            sku: product.sku || null,
            category: product.category || null,
            price,
            currency,
            inventory,
            status: mapSnapDealProductStatus(product.status, inventory),
            imageUrl: product.imageUrl || null,
            syncedAt: new Date(),
          },
        });

        synced++;
      }

      pageNumber++;
      hasMore = products.length === pageSize;
    }

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
    const message = error instanceof Error ? error.message : "Unknown error";
    try {
      await prisma.unifiedSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "failed",
          syncedCount: synced,
          errorMessage: message,
          completedAt: new Date(),
        },
      });
    } catch (logUpdateError) {
      const logMsg =
        logUpdateError instanceof Error
          ? logUpdateError.message
          : "Unknown error";
      console.error(
        `SnapDeal syncProducts: Failed to update sync log ${syncLog.id} (partial syncedCount=${synced}): ${logMsg}`
      );
    }
    throw error;
  }
}

export async function syncSnapDeal(
  connection: MarketplaceConnection
): Promise<SyncResult> {
  const errors: string[] = [];
  let ordersSynced = 0;
  let productsSynced = 0;
  let ordersSucceeded = false;
  let productsSucceeded = false;

  try {
    ordersSynced = await syncSnapDealOrders(connection);
    ordersSucceeded = true;
  } catch (error) {
    errors.push(
      `Orders: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  try {
    productsSynced = await syncSnapDealProducts(connection);
    productsSucceeded = true;
  } catch (error) {
    errors.push(
      `Products: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  // Only update lastSyncAt when BOTH syncs succeed
  if (ordersSucceeded && productsSucceeded) {
    try {
      await prisma.marketplaceConnection.update({
        where: { id: connection.id },
        data: { lastSyncAt: new Date() },
      });
    } catch (updateError) {
      const msg =
        updateError instanceof Error ? updateError.message : "Unknown error";
      console.error(
        `SnapDeal sync: Failed to update lastSyncAt for connection ${connection.id}: ${msg}`
      );
    }
  }

  return { ordersSynced, productsSynced, errors };
}
