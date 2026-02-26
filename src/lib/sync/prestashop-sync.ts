import { createHash } from "crypto";
import { MarketplaceConnection } from "@prisma/client";
import prisma from "@/lib/prisma";
import { PrestaShopClient, extractName } from "@/lib/prestashop/client";
import {
  mapPrestaShopOrderStatus,
  mapPrestaShopProductStatus,
  SyncResult,
} from "./types";

/**
 * Compute a deterministic externalItemId for an order row.
 * Uses product_id when available; otherwise hashes stable row fields
 * so the ID remains consistent across re-syncs regardless of array order.
 */
function computeStableItemId(
  row: { product_id?: string | number; product_name?: string; product_reference?: string; unit_price_tax_incl?: string | number },
  externalOrderId: string
): string {
  if (row.product_id) return String(row.product_id);

  const key = [
    externalOrderId,
    row.product_name || "",
    row.product_reference || "",
    String(row.unit_price_tax_incl ?? ""),
  ].join("|");

  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}

/**
 * Safely parse a float value, returning fallback if invalid
 */
function safeParseFloat(value: unknown, fallback: number = 0): number {
  if (value === null || value === undefined) return fallback;
  const parsed = parseFloat(String(value));
  return Number.isNaN(parsed) ? fallback : parsed;
}

/** Default currency when PrestaShop currency lookup fails */
const DEFAULT_CURRENCY = "EUR";

/**
 * Resolve currency ISO code from a PrestaShop currency ID.
 * Falls back to DEFAULT_CURRENCY on any failure.
 */
async function resolveCurrency(
  client: PrestaShopClient,
  currencyId: string | undefined
): Promise<string> {
  if (!currencyId || currencyId === "0") return DEFAULT_CURRENCY;
  try {
    const iso = await client.getCurrencyIsoById(currencyId);
    return iso || DEFAULT_CURRENCY;
  } catch {
    return DEFAULT_CURRENCY;
  }
}

/**
 * Create a PrestaShop client from a marketplace connection.
 * accessToken stores the encrypted API key.
 * externalId stores the normalized store URL.
 */
function createClient(connection: MarketplaceConnection): PrestaShopClient {
  if (!connection.accessToken) {
    throw new Error("No PrestaShop API key found");
  }
  if (!connection.externalId) {
    throw new Error("No PrestaShop store URL found");
  }

  // accessToken is encrypted in DB — PrestaShopClient decrypts it
  return new PrestaShopClient(connection.accessToken, connection.externalId);
}

export async function syncPrestaShopOrders(
  connection: MarketplaceConnection
): Promise<number> {
  const client = createClient(connection);
  let synced = 0;

  const syncLog = await prisma.unifiedSyncLog.create({
    data: {
      connectionId: connection.id,
      marketplace: "PRESTASHOP",
      entity: "orders",
      status: "started",
      trigger: "cron",
    },
  });

  try {
    let offset = 0;
    const pageSize = 50;
    let hasMore = true;

    while (hasMore) {
      const orders = await client.getOrders({ limit: pageSize, offset });

      for (const order of orders) {
        const externalOrderId = order.id ? String(order.id) : "";
        if (!externalOrderId || externalOrderId.trim() === "") {
          console.warn(
            `PrestaShop sync: Skipping order with missing/empty ID [connectionId=${connection.id}]`
          );
          continue;
        }

        const stateId = parseInt(String(order.current_state), 10);
        const totalAmount = safeParseFloat(order.total_paid_tax_incl);
        const currency = await resolveCurrency(client, order.id_currency);

        // Validate date_add for orderedAt
        let orderedAt: Date;
        if (order.date_add && !isNaN(Date.parse(order.date_add))) {
          orderedAt = new Date(order.date_add);
        } else {
          console.warn(
            `PrestaShop sync: Invalid/missing date_add for order ${externalOrderId} [connectionId=${connection.id}], falling back to current time`
          );
          orderedAt = new Date();
        }

        // Extract line items from associations
        const orderRows = order.associations?.order_rows ?? [];
        const itemCount = orderRows.reduce(
          (sum, row) => sum + (parseInt(String(row.product_quantity), 10) || 1),
          0
        );

        // Upsert order and replace items atomically
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
              marketplace: "PRESTASHOP",
              connectionId: connection.id,
              externalOrderId,
              status: mapPrestaShopOrderStatus(isNaN(stateId) ? 0 : stateId),
              currency,
              totalAmount,
              itemCount,
              orderedAt,
            },
            update: {
              status: mapPrestaShopOrderStatus(isNaN(stateId) ? 0 : stateId),
              currency,
              totalAmount,
              itemCount,
              syncedAt: new Date(),
            },
          });

          // Replace order items
          await tx.unifiedOrderItem.deleteMany({
            where: { orderId: unifiedOrder.id },
          });

          if (orderRows.length > 0) {
            await tx.unifiedOrderItem.createMany({
              data: orderRows.map((row) => {
                const qty = parseInt(String(row.product_quantity), 10) || 1;
                const unitPrice = safeParseFloat(row.unit_price_tax_incl);
                return {
                  orderId: unifiedOrder.id,
                  externalItemId: computeStableItemId(row, externalOrderId),
                  title: row.product_name || "",
                  sku: row.product_reference || null,
                  quantity: qty,
                  unitPrice,
                  totalPrice: Math.round(unitPrice * qty * 100) / 100,
                  currency,
                };
              }),
            });
          }
        });

        synced++;
      }

      offset += pageSize;
      hasMore = orders.length === pageSize;
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
        `PrestaShop syncOrders: Failed to update sync log ${syncLog.id} (partial syncedCount=${synced}): ${logMsg}`
      );
    }
    throw error;
  }
}

export async function syncPrestaShopProducts(
  connection: MarketplaceConnection
): Promise<number> {
  const client = createClient(connection);
  let synced = 0;

  const syncLog = await prisma.unifiedSyncLog.create({
    data: {
      connectionId: connection.id,
      marketplace: "PRESTASHOP",
      entity: "products",
      status: "started",
      trigger: "cron",
    },
  });

  try {
    // Fetch the shop's configured default currency (PS_CURRENCY_DEFAULT)
    const defaultCurrencyId = await client.getDefaultCurrencyId();
    const currency = await resolveCurrency(client, defaultCurrencyId || "1");

    let offset = 0;
    const pageSize = 50;
    let hasMore = true;

    while (hasMore) {
      const products = await client.getProducts({ limit: pageSize, offset });

      for (const product of products) {
        const externalId = product.id ? String(product.id) : "";
        if (!externalId || externalId.trim() === "") {
          console.warn(
            `PrestaShop sync: Skipping product with missing/empty ID [connectionId=${connection.id}]`
          );
          continue;
        }

        const name = extractName(product.name);
        const price = safeParseFloat(product.price);
        // Coerce active to boolean — PrestaShop returns "0" or "1" as string
        const active = product.active === "1";

        // Get stock quantity — PrestaShop separates stock from product
        // Only fetch from stock API when the product payload lacks quantity
        let quantity: number;
        if (product.quantity === undefined || product.quantity === null) {
          try {
            quantity = Number(await client.getStockAvailable(product.id)) || 0;
          } catch {
            // If stock API fails, use 0
            quantity = 0;
          }
        } else {
          const parsed = Number(product.quantity);
          quantity = Number.isNaN(parsed) ? 0 : parsed;
        }

        await prisma.unifiedProduct.upsert({
          where: {
            connectionId_externalId: {
              connectionId: connection.id,
              externalId,
            },
          },
          create: {
            userId: connection.userId,
            marketplace: "PRESTASHOP",
            connectionId: connection.id,
            externalId,
            title: name,
            sku: product.reference || null,
            category: product.id_category_default
              ? String(product.id_category_default)
              : null,
            price,
            currency,
            inventory: quantity,
            status: mapPrestaShopProductStatus(active, quantity),
          },
          update: {
            title: name,
            sku: product.reference || null,
            category: product.id_category_default
              ? String(product.id_category_default)
              : null,
            price,
            currency,
            inventory: quantity,
            status: mapPrestaShopProductStatus(active, quantity),
            syncedAt: new Date(),
          },
        });

        synced++;
      }

      offset += pageSize;
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
        `PrestaShop syncProducts: Failed to update sync log ${syncLog.id} (partial syncedCount=${synced}): ${logMsg}`
      );
    }
    throw error;
  }
}

export async function syncPrestaShop(
  connection: MarketplaceConnection
): Promise<SyncResult> {
  const errors: string[] = [];
  let ordersSynced = 0;
  let productsSynced = 0;
  let ordersSucceeded = false;
  let productsSucceeded = false;

  try {
    ordersSynced = await syncPrestaShopOrders(connection);
    ordersSucceeded = true;
  } catch (error) {
    errors.push(
      `Orders: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  try {
    productsSynced = await syncPrestaShopProducts(connection);
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
        `PrestaShop sync: Failed to update lastSyncAt for connection ${connection.id}: ${msg}`
      );
    }
  }

  return { ordersSynced, productsSynced, errors };
}
