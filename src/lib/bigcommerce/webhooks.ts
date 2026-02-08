/**
 * BigCommerce Webhook Management
 *
 * BigCommerce webhooks are registered via the API.
 * Verification uses store hash header + HMAC SHA-256 signature.
 */

import crypto from "crypto";
import { BigCommerceClient } from "./client";

const WEBHOOK_SCOPES = [
  "store/order/created",
  "store/order/updated",
  "store/product/created",
  "store/product/updated",
];

/**
 * Verify BigCommerce webhook store hash matches expected value.
 * This is the primary verification method as BigCommerce identifies
 * the source store via the X-BC-Store-Hash header.
 */
export function verifyStoreHash(
  storeHashHeader: string | null,
  expectedStoreHash: string
): boolean {
  if (!storeHashHeader || !expectedStoreHash) {
    return false;
  }
  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(storeHashHeader),
      Buffer.from(expectedStoreHash)
    );
  } catch {
    // Buffers of different lengths will throw
    return false;
  }
}

/**
 * Verify HMAC SHA-256 signature of a BigCommerce webhook payload.
 * @param rawBody - The raw request body string (not parsed JSON)
 * @param signatureHeader - The HMAC signature from the request header
 * @param secret - The shared webhook secret
 * @returns true if the signature is valid
 */
export function verifyWebhookHmac(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !secret || !rawBody) {
    return false;
  }

  const computed = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed),
      Buffer.from(signatureHeader)
    );
  } catch {
    // Buffers of different lengths will throw
    return false;
  }
}

interface WebhookRegistrationResult {
  registered: string[];
  skipped: string[];
  failures: { scope: string; error: string }[];
}

/**
 * Register webhooks for a BigCommerce store.
 * Returns structured result with registered, skipped, and failed scopes.
 */
export async function registerWebhooks(
  client: BigCommerceClient,
  deliveryUrl: string
): Promise<WebhookRegistrationResult> {
  // Normalize URL once — used for both comparison and registration to ensure consistency
  const normalizedDeliveryUrl = deliveryUrl.replace(/\/+$/, "");

  // Get existing webhooks to avoid duplicates — abort on failure to prevent duplicate creation
  let existingScopes: Set<string>;
  try {
    const existing = await client.getWebhooks();
    const existingData = Array.isArray(existing?.data) ? existing.data : [];
    existingScopes = new Set(
      existingData
        .filter((w) => typeof w.destination === "string" && w.destination.replace(/\/+$/, "") === normalizedDeliveryUrl)
        .map((w) => w.scope)
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(
      `BigCommerce: Failed to fetch existing webhooks for ${normalizedDeliveryUrl}, aborting registration to prevent duplicates: ${message}`
    );
  }

  const registered: string[] = [];
  const skipped: string[] = [];
  const failures: { scope: string; error: string }[] = [];

  // Register webhooks for each scope
  for (const scope of WEBHOOK_SCOPES) {
    if (existingScopes.has(scope)) {
      skipped.push(scope);
      continue;
    }

    try {
      await client.createWebhook({
        scope,
        destination: normalizedDeliveryUrl,
        is_active: true,
      });
      registered.push(scope);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to register BigCommerce webhook for ${scope}: ${message}`);
      failures.push({ scope, error: message });
    }
  }

  return { registered, skipped, failures };
}

/**
 * Deregister all ShopIQ webhooks from a BigCommerce store.
 * Returns count of deleted webhooks and any failures.
 */
export async function deregisterWebhooks(
  client: BigCommerceClient,
  deliveryUrl: string
): Promise<{ deleted: number; failures: { webhookId: number; error: string }[] }> {
  let webhookData: { data: { id: number; destination: string; scope: string }[] };
  try {
    webhookData = await client.getWebhooks();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(
      `BigCommerce: Failed to fetch webhooks for deregistration (${deliveryUrl}): ${message}`
    );
  }

  let deleted = 0;
  const failures: { webhookId: number; error: string }[] = [];

  // Delete webhooks that point to our delivery URL (normalize trailing slashes)
  const normalizedDeliveryUrl = deliveryUrl.replace(/\/+$/, "");
  const webhooks = Array.isArray(webhookData?.data) ? webhookData.data : [];
  for (const webhook of webhooks) {
    if (typeof webhook.destination === "string" && webhook.destination.replace(/\/+$/, "") === normalizedDeliveryUrl) {
      try {
        await client.deleteWebhook(webhook.id);
        deleted++;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`Failed to delete BigCommerce webhook ${webhook.id}: ${message}`);
        failures.push({ webhookId: webhook.id, error: message });
      }
    }
  }

  return { deleted, failures };
}
