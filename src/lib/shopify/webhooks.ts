import crypto from "crypto";
import { decryptToken } from "./oauth";
import { ShopifyStoreConfig } from "./client";
import { isValidShopifyDomain } from "./validation";

const API_VERSION = process.env.SHOPIFY_API_VERSION || "2025-10";
const FETCH_TIMEOUT_MS = 15000;

const WEBHOOK_TOPICS = [
  "orders/create",
  "orders/updated",
  "products/create",
  "products/update",
];

// Re-export for external consumers
export { isValidShopifyDomain } from "./validation";

/**
 * Verify the HMAC signature of a Shopify webhook request body.
 * Uses SHOPIFY_API_SECRET to compute HMAC-SHA256 of the raw body.
 */
export function verifyWebhookHmac(
  rawBody: string,
  hmacHeader: string
): boolean {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) {
    console.error("SHOPIFY_API_SECRET is not set — cannot verify webhook HMAC");
    return false;
  }

  const computed = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  // Constant-time comparison: always run timingSafeEqual regardless of length
  const computedBuf = Buffer.from(computed);
  const hmacBuf = Buffer.from(hmacHeader);
  const lengthsMatch = computedBuf.length === hmacBuf.length;
  // If lengths differ, compare against a zero-filled buffer of the correct size
  // to avoid leaking length info via timing
  const compareBuf = lengthsMatch ? hmacBuf : Buffer.alloc(computedBuf.length);
  return crypto.timingSafeEqual(computedBuf, compareBuf) && lengthsMatch;
}

interface WebhookRegistrationResult {
  successes: string[];
  failures: { topic: string; error: string }[];
  skipped: string[];
}

/**
 * Register webhooks for a Shopify store.
 * Called after OAuth callback to enable real-time data.
 * Returns structured result with successes, failures, and skipped topics.
 * Throws an error if all registrations fail.
 */
export async function registerWebhooks(
  store: ShopifyStoreConfig
): Promise<WebhookRegistrationResult> {
  if (!store.accessToken) {
    throw new Error("Store access token is required to register webhooks");
  }

  // Validate domain before making any requests (SSRF prevention)
  if (!isValidShopifyDomain(store.domain)) {
    throw new Error(`Invalid Shopify domain: ${store.domain} — aborting webhook registration`);
  }

  const accessToken = decryptToken(store.accessToken);
  // Use server-only APP_URL; validate in production, fallback to localhost in dev only
  const appUrl = process.env.APP_URL;
  if (!appUrl && process.env.NODE_ENV === "production") {
    throw new Error("APP_URL not configured in production — cannot register webhooks");
  }
  const normalizedAppUrl = (appUrl || "http://localhost:3000").replace(/\/+$/, "");
  const address = `${normalizedAppUrl}/api/webhooks/shopify`;

  // First list existing webhooks to avoid duplicates — abort on failure
  const listResult = await listWebhooks(store);
  if (!listResult.ok) {
    throw new Error(`Failed to list existing webhooks: ${listResult.error} — aborting to prevent duplicates`);
  }
  const existingTopics = new Set(
    listResult.webhooks
      .filter((w) => w.address === address)
      .map((w) => w.topic)
  );

  const successes: string[] = [];
  const failures: { topic: string; error: string }[] = [];
  const skipped: string[] = [];

  for (const topic of WEBHOOK_TOPICS) {
    if (existingTopics.has(topic)) {
      skipped.push(topic);
      continue;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(
        `https://${store.domain}/admin/api/${API_VERSION}/webhooks.json`,
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            webhook: { topic, address, format: "json" },
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        const errorMessage = `${response.status} ${response.statusText}: ${errorBody}`;
        console.error(`Failed to register webhook ${topic}: ${errorMessage}`);
        failures.push({ topic, error: errorMessage });
      } else {
        successes.push(topic);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to register webhook ${topic}: ${message}`);
      failures.push({ topic, error: message });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // If we have failures and no successes (complete failure), throw an error
  if (failures.length > 0 && successes.length === 0 && skipped.length === 0) {
    const errorDetails = failures
      .map((f) => `${f.topic}: ${f.error}`)
      .join("; ");
    throw new Error(`All webhook registrations failed: ${errorDetails}`);
  }

  return { successes, failures, skipped };
}

interface WebhookFailure {
  webhookId: number;
  topic: string;
  error: string;
}

/**
 * Deregister all Frame webhooks from a Shopify store.
 * Called on marketplace disconnect.
 * Returns list of failures if any webhooks failed to delete.
 */
export async function deregisterWebhooks(
  store: ShopifyStoreConfig
): Promise<{ deleted: number; failures: WebhookFailure[] }> {
  if (!store.accessToken) {
    return { deleted: 0, failures: [] };
  }

  // Validate domain before making any requests (SSRF prevention)
  if (!isValidShopifyDomain(store.domain)) {
    console.error(`Shopify deregisterWebhooks: Invalid domain ${store.domain}`);
    return { deleted: 0, failures: [] };
  }

  let accessToken: string;
  try {
    accessToken = decryptToken(store.accessToken);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`Shopify deregisterWebhooks: Failed to decrypt access token for store ${store.domain}: ${msg}`);
    return { deleted: 0, failures: [] };
  }
  // Use server-only APP_URL; validate in production, fallback to localhost in dev only
  const appUrl = process.env.APP_URL;
  if (!appUrl && process.env.NODE_ENV === "production") {
    console.error("Shopify deregisterWebhooks: APP_URL not configured in production");
    return { deleted: 0, failures: [] };
  }
  const normalizedAppUrl = (appUrl || "http://localhost:3000").replace(/\/+$/, "");
  const address = `${normalizedAppUrl}/api/webhooks/shopify`;

  const listResult = await listWebhooks(store);
  if (!listResult.ok) {
    console.error(`Shopify deregisterWebhooks: Failed to list webhooks: ${listResult.error}`);
    return { deleted: 0, failures: [] };
  }
  const ours = listResult.webhooks.filter((w) => w.address === address);

  let deleted = 0;
  const failures: WebhookFailure[] = [];

  for (const webhook of ours) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(
        `https://${store.domain}/admin/api/${API_VERSION}/webhooks/${webhook.id}.json`,
        {
          method: "DELETE",
          signal: controller.signal,
          headers: {
            "X-Shopify-Access-Token": accessToken,
          },
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(
          `Failed to delete webhook ${webhook.id} (${webhook.topic}): ${response.status} ${response.statusText} - ${errorBody}`
        );
        failures.push({
          webhookId: webhook.id,
          topic: webhook.topic,
          error: `${response.status} ${response.statusText}: ${errorBody}`,
        });
      } else {
        deleted++;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(
        `Failed to delete webhook ${webhook.id} (${webhook.topic}): ${message}`
      );
      failures.push({
        webhookId: webhook.id,
        topic: webhook.topic,
        error: message,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return { deleted, failures };
}

interface ShopifyWebhook {
  id: number;
  topic: string;
  address: string;
}

type ListWebhooksResult =
  | { ok: true; webhooks: ShopifyWebhook[] }
  | { ok: false; error: string };

async function listWebhooks(store: ShopifyStoreConfig): Promise<ListWebhooksResult> {
  if (!store.accessToken) {
    return { ok: false, error: "Store access token is missing" };
  }

  if (!isValidShopifyDomain(store.domain)) {
    return { ok: false, error: `Invalid Shopify domain: ${store.domain}` };
  }

  let accessToken: string;
  try {
    accessToken = decryptToken(store.accessToken);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: `Failed to decrypt access token: ${msg}` };
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://${store.domain}/admin/api/${API_VERSION}/webhooks.json`,
      {
        signal: controller.signal,
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status} ${response.statusText}` };
    }

    const data = await response.json();
    return { ok: true, webhooks: data.webhooks || [] };
  } catch (error) {
    const isAbortError =
      (error instanceof DOMException && error.name === "AbortError") ||
      (error instanceof Error && error.name === "AbortError");
    if (isAbortError) {
      console.error(`listWebhooks timed out after ${FETCH_TIMEOUT_MS}ms for store ${store.domain}`);
    } else {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`listWebhooks failed for store ${store.domain}: ${message}`);
    }
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: errorMsg };
  } finally {
    clearTimeout(timeoutId);
  }
}
