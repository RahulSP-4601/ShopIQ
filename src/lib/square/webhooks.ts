/**
 * Square Webhook Management
 *
 * Square webhooks are registered via the API.
 * Verification is done using HMAC-SHA256 signature.
 */

import crypto from "crypto";
import { SquareClient } from "./client";

const WEBHOOK_EVENT_TYPES = [
  "order.created",
  "order.updated",
  "catalog.version.updated",
  "inventory.count.updated",
];

/**
 * Verify Square webhook signature.
 *
 * Square sends a SHA-256 HMAC signature in the x-square-hmacsha256-signature header.
 * The signature is computed from: notification_url + body using the signature key.
 */
export function verifyWebhookSignature(
  body: string,
  signature: string | null,
  signatureKey: string,
  notificationUrl: string
): boolean {
  if (!signature || !signatureKey || !body || !notificationUrl) {
    return false;
  }

  // Square's signature is computed from: notification_url + body
  const payload = notificationUrl + body;

  const expectedSignature = crypto
    .createHmac("sha256", signatureKey)
    .update(payload)
    .digest("base64");

  // Hash both values to fixed-length SHA-256 digests (32 bytes each) so
  // timingSafeEqual never leaks length information via early exceptions
  const expectedDigest = crypto.createHash("sha256").update(expectedSignature).digest();
  const providedDigest = crypto.createHash("sha256").update(signature).digest();
  return crypto.timingSafeEqual(expectedDigest, providedDigest);
}

/**
 * Register webhooks for a Square merchant.
 * Returns the signature key for webhook verification, or null if registration fails.
 */
export async function registerWebhooks(
  client: SquareClient,
  notificationUrl: string
): Promise<{ signatureKey: string } | null> {
  if (!notificationUrl || typeof notificationUrl !== "string" || notificationUrl.trim() === "") {
    console.error("Square webhook: registerWebhooks called with empty or invalid notificationUrl");
    return null;
  }

  try {
    // Check for existing subscriptions to avoid duplicates
    const existing = await client.listWebhookSubscriptions();
    const existingSubscription = existing.find(
      (sub) => sub.notification_url === notificationUrl
    );

    if (existingSubscription) {
      // Validate signature_key exists and is valid
      if (
        !existingSubscription.signature_key ||
        typeof existingSubscription.signature_key !== "string" ||
        existingSubscription.signature_key.trim() === ""
      ) {
        // Broken subscription — delete it and recreate below
        console.warn(
          "Square webhook: Existing subscription has invalid signature_key — deleting and recreating"
        );
        if (!existingSubscription.id || typeof existingSubscription.id !== "string" || existingSubscription.id.trim() === "") {
          console.error("Square webhook: Broken subscription also has invalid id — cannot delete, returning null");
          return null;
        }
        try {
          await client.deleteWebhookSubscription(existingSubscription.id);
        } catch (deleteError) {
          const msg = deleteError instanceof Error ? deleteError.message : "Unknown error";
          console.error(`Square webhook: Failed to delete broken subscription ${existingSubscription.id}: ${msg}`);
          return null;
        }
        // Fall through to create a new subscription
      } else {
        return { signatureKey: existingSubscription.signature_key };
      }
    }

    // Create new subscription — handle TOCTOU race where concurrent processes
    // both see no existing subscription and attempt to create one
    let subscription;
    try {
      subscription = await client.createWebhookSubscription({
        notification_url: notificationUrl,
        event_types: WEBHOOK_EVENT_TYPES,
        enabled: true,
      });
    } catch (createError) {
      // On conflict/duplicate error, re-fetch existing subscriptions and return the match
      const msg = createError instanceof Error ? createError.message : "Unknown error";
      console.warn(`Square webhook: Create failed (possible duplicate race): ${msg} — re-fetching`);
      try {
        const retryExisting = await client.listWebhookSubscriptions();
        const match = retryExisting.find(
          (sub) => sub.notification_url === notificationUrl
        );
        if (
          match?.signature_key &&
          typeof match.signature_key === "string" &&
          match.signature_key.trim() !== ""
        ) {
          return { signatureKey: match.signature_key };
        }
      } catch (retryError) {
        const retryMsg = retryError instanceof Error ? retryError.message : "Unknown error";
        console.error(`Square webhook: Re-fetch after create conflict also failed: ${retryMsg}`);
      }
      return null;
    }

    if (!subscription) {
      console.error("Square webhook: createWebhookSubscription returned null");
      return null;
    }

    // Validate signature_key exists and is valid
    if (
      !subscription.signature_key ||
      typeof subscription.signature_key !== "string" ||
      subscription.signature_key.trim() === ""
    ) {
      console.error(
        "Square webhook: Created subscription has invalid signature_key"
      );
      return null;
    }

    return { signatureKey: subscription.signature_key };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Square webhook registration failed: ${message}`);
    return null;
  }
}

/**
 * Deregister webhooks for a Square merchant.
 */
export async function deregisterWebhooks(
  client: SquareClient,
  notificationUrl: string
): Promise<void> {
  if (!notificationUrl || typeof notificationUrl !== "string" || notificationUrl.trim() === "") {
    console.error("Square webhook: deregisterWebhooks called with empty or invalid notificationUrl");
    return;
  }

  let subscriptions: Awaited<ReturnType<typeof client.listWebhookSubscriptions>>;
  try {
    subscriptions = await client.listWebhookSubscriptions();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Failed to list Square webhook subscriptions: ${message}`);
    return;
  }

  for (const subscription of subscriptions) {
    if (subscription.notification_url === notificationUrl) {
      if (!subscription.id) {
        console.warn("Square webhook: Skipping subscription with missing id during deregistration");
        continue;
      }
      try {
        await client.deleteWebhookSubscription(subscription.id);
      } catch (error) {
        // Sanitize error logging to avoid leaking sensitive data
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`Failed to delete Square webhook ${subscription.id}: ${message}`);
      }
    }
  }
}
