import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/razorpay/client";

/**
 * Permanent webhook errors that should NOT be retried by Razorpay.
 * Examples: missing metadata, validation failures, bad payloads.
 */
class PermanentWebhookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentWebhookError";
  }
}

/**
 * Razorpay Webhook Handler
 *
 * Handles subscription lifecycle events from Razorpay:
 * - subscription.activated   → First payment successful → ACTIVE
 * - subscription.charged     → Renewal payment → ACTIVE + update billing period
 * - subscription.halted      → Multiple payment failures → PAST_DUE
 * - subscription.cancelled   → Cancelled → CANCELED
 * - subscription.completed   → All billing cycles completed → CANCELED
 * - subscription.paused      → Paused → PAUSED
 * - subscription.resumed     → Resumed from pause → ACTIVE
 * - payment.failed           → Individual payment failure → log warning
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing x-razorpay-signature header" },
      { status: 400 }
    );
  }

  const rawBody = await request.text();

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error("Razorpay webhook signature verification failed");
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType: string | undefined = payload.event;
  const subscriptionEntity = payload.payload?.subscription?.entity;
  const paymentEntity = payload.payload?.payment?.entity;
  const entity = subscriptionEntity || paymentEntity;

  // Validate required fields before building dedup key — reject malformed payloads
  if (!eventType) {
    console.error("Razorpay webhook missing event type");
    return NextResponse.json({ error: "Missing event type" }, { status: 400 });
  }

  // For subscription/payment events, entity.id is required for a stable dedup key
  const entityId: string | undefined = entity?.id;
  if (!entityId) {
    console.error(`Razorpay webhook ${eventType}: missing entity ID in payload`);
    // Return 200 to prevent infinite retries on permanently malformed payloads
    return NextResponse.json({ received: true, error: "Missing entity ID" });
  }

  if (!payload.created_at) {
    console.error(`Razorpay webhook ${eventType}: missing created_at in payload`);
    return NextResponse.json({ received: true, error: "Missing created_at" });
  }

  // Build stable dedup key from validated fields
  const dedupKey = `${eventType}_${entityId}_${payload.created_at}`;

  // Check if already processed (read-only check before processing)
  try {
    const existing = await prisma.paymentWebhookEvent.findUnique({
      where: {
        provider_eventId: { provider: "razorpay", eventId: dedupKey },
      },
    });
    if (existing) {
      return NextResponse.json({ received: true, deduplicated: true });
    }
  } catch (lookupError) {
    // Lookup failed — continue processing (dedup insert will catch true duplicates)
    console.error("Webhook dedup lookup failed:", lookupError);
  }

  // Process the event FIRST, then insert dedup record on success
  try {
    switch (eventType) {
      case "subscription.authenticated":
        // Subscription created, mandate authorized — no DB change needed
        break;

      case "subscription.activated":
        await handleSubscriptionActivated(subscriptionEntity);
        break;

      case "subscription.charged":
        await handleSubscriptionCharged(subscriptionEntity);
        break;

      case "subscription.pending":
        // Payment in progress — keep current status
        break;

      case "subscription.halted":
        await handleSubscriptionHalted(subscriptionEntity);
        break;

      case "subscription.cancelled":
      case "subscription.completed":
        await handleSubscriptionCancelled(subscriptionEntity);
        break;

      case "subscription.paused":
        await handleSubscriptionPaused(subscriptionEntity);
        break;

      case "subscription.resumed":
        await handleSubscriptionResumed(subscriptionEntity);
        break;

      case "payment.failed":
        console.warn(`Razorpay payment failed: payment_id=${paymentEntity?.id}, reason=${paymentEntity?.error_description || "unknown"}`);
        break;

      default:
        // Ignore unhandled event types
        break;
    }

    // Processing succeeded — insert dedup record so retries are skipped
    try {
      await prisma.paymentWebhookEvent.create({
        data: {
          provider: "razorpay",
          eventId: dedupKey,
          eventType: eventType,
        },
      });
    } catch (dedupError: unknown) {
      const prismaError = dedupError as { code?: string };
      if (prismaError.code === "P2002") {
        // Already recorded by a concurrent request — that's fine
      } else {
        // Non-critical: event was processed but dedup record failed.
        // Next retry will re-process idempotently (all handlers are idempotent).
        console.error("Webhook dedup insert failed (event was processed):", dedupError);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (error instanceof PermanentWebhookError) {
      // Permanent failure — return 200 so Razorpay stops retrying
      // Still insert dedup record to prevent re-processing permanently bad payloads
      console.error(`Razorpay webhook permanent error (${eventType}): ${message}`);
      try {
        await prisma.paymentWebhookEvent.create({
          data: {
            provider: "razorpay",
            eventId: dedupKey,
            eventType: eventType,
          },
        });
      } catch {
        // Best-effort — ignore
      }
      return NextResponse.json({ received: true, error: "Permanent failure" });
    }
    // Transient failure — return 500 so Razorpay retries.
    // No dedup record inserted, so the retry will be processed.
    console.error(`Razorpay webhook transient error (${eventType}): ${message}`);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * subscription.activated — First payment successful.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionActivated(entity: any): Promise<void> {
  const subscriptionId = entity?.id;
  if (!subscriptionId) {
    throw new PermanentWebhookError("subscription.activated: missing subscription ID");
  }

  const userId = entity?.notes?.userId;

  // Try to find subscription by Razorpay subscription ID
  const subscription = await prisma.subscription.findFirst({
    where: { razorpaySubscriptionId: subscriptionId },
  });

  if (!subscription && userId) {
    // Fallback: find by userId from notes.
    // Use try-catch around create/update to handle P2002 race conditions
    // (concurrent webhook deliveries for the same user).
    const existingForUser = await prisma.subscription.findFirst({
      where: { userId },
    });

    if (!existingForUser) {
      // No record at all — create new (may race with concurrent request)
      try {
        await prisma.subscription.create({
          data: {
            userId,
            status: "ACTIVE",
            razorpaySubscriptionId: subscriptionId,
            razorpayCustomerId: entity?.customer_id ?? null,
          },
        });
      } catch (createError: unknown) {
        const prismaError = createError as { code?: string };
        if (prismaError.code === "P2002") {
          // Concurrent request already created the record — update it instead
          const result = await prisma.subscription.updateMany({
            where: {
              userId,
              OR: [
                { razorpaySubscriptionId: null },
                { razorpaySubscriptionId: subscriptionId },
              ],
            },
            data: {
              status: "ACTIVE",
              razorpaySubscriptionId: subscriptionId,
              razorpayCustomerId: entity?.customer_id ?? null,
            },
          });
          if (result.count === 0) {
            // Row exists but has a different razorpaySubscriptionId — conflict
            throw new PermanentWebhookError(
              `subscription.activated: P2002 recovery failed — user's subscription already ` +
              `has a different razorpaySubscriptionId, refusing to overwrite with ${subscriptionId}. ` +
              `Manual reconciliation required.`
            );
          }
        } else {
          throw createError;
        }
      }
      return;
    }

    // Record exists — only update if razorpaySubscriptionId is truly absent or matches
    if (existingForUser.razorpaySubscriptionId == null || existingForUser.razorpaySubscriptionId === "" || existingForUser.razorpaySubscriptionId === subscriptionId) {
      await prisma.subscription.update({
        where: { id: existingForUser.id },
        data: {
          status: "ACTIVE",
          razorpaySubscriptionId: subscriptionId,
          razorpayCustomerId: entity?.customer_id ?? null,
        },
      });
      return;
    }

    // Record exists with a DIFFERENT razorpaySubscriptionId — permanent conflict
    const userHash = crypto.createHash("sha256").update(userId).digest("hex").slice(0, 8);
    throw new PermanentWebhookError(
      `subscription.activated: User [hash:${userHash}] (sub_id=${existingForUser.id}) already has ` +
      `razorpaySubscriptionId=${existingForUser.razorpaySubscriptionId}, ` +
      `refusing to overwrite with ${subscriptionId}. Manual reconciliation required.`
    );
  }

  if (!subscription) {
    // Throw transient error — verify endpoint may not have run yet
    throw new Error(
      `subscription.activated: No subscription found for razorpaySubscriptionId=${subscriptionId}. Razorpay will retry.`
    );
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: "ACTIVE" },
  });
}

/**
 * subscription.charged — Renewal payment successful. Update billing period.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionCharged(entity: any): Promise<void> {
  const subscriptionId = entity?.id;
  if (!subscriptionId) {
    throw new PermanentWebhookError("subscription.charged: missing subscription ID");
  }

  const subscription = await prisma.subscription.findFirst({
    where: { razorpaySubscriptionId: subscriptionId },
  });

  if (!subscription) {
    throw new Error(
      `subscription.charged: No subscription found for razorpaySubscriptionId=${subscriptionId}. Razorpay will retry.`
    );
  }

  // Razorpay provides current_start and current_end as Unix timestamps
  const updateData: Record<string, unknown> = { status: "ACTIVE" };

  if (entity?.current_start && typeof entity.current_start === "number") {
    updateData.currentPeriodStart = new Date(entity.current_start * 1000);
  }
  if (entity?.current_end && typeof entity.current_end === "number") {
    updateData.currentPeriodEnd = new Date(entity.current_end * 1000);
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: updateData,
  });
}

/**
 * subscription.halted — Multiple payment failures → PAST_DUE.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionHalted(entity: any): Promise<void> {
  const subscriptionId = entity?.id;
  if (!subscriptionId) {
    throw new PermanentWebhookError("subscription.halted: missing subscription ID");
  }

  const result = await prisma.subscription.updateMany({
    where: { razorpaySubscriptionId: subscriptionId },
    data: { status: "PAST_DUE" },
  });

  if (result.count === 0) {
    throw new Error(`subscription.halted: No subscription found for razorpaySubscriptionId=${subscriptionId}. Razorpay will retry.`);
  }
}

/**
 * subscription.cancelled / subscription.completed → CANCELED.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionCancelled(entity: any): Promise<void> {
  const subscriptionId = entity?.id;
  if (!subscriptionId) {
    throw new PermanentWebhookError("subscription.cancelled: missing subscription ID");
  }

  const result = await prisma.subscription.updateMany({
    where: { razorpaySubscriptionId: subscriptionId },
    data: { status: "CANCELED" },
  });

  if (result.count === 0) {
    throw new Error(`subscription.cancelled: No subscription found for razorpaySubscriptionId=${subscriptionId}. Razorpay will retry.`);
  }
}

/**
 * subscription.paused → PAUSED.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionPaused(entity: any): Promise<void> {
  const subscriptionId = entity?.id;
  if (!subscriptionId) {
    throw new PermanentWebhookError("subscription.paused: missing subscription ID");
  }

  const result = await prisma.subscription.updateMany({
    where: { razorpaySubscriptionId: subscriptionId },
    data: { status: "PAUSED" },
  });

  if (result.count === 0) {
    throw new Error(`subscription.paused: No subscription found for razorpaySubscriptionId=${subscriptionId}. Razorpay will retry.`);
  }
}

/**
 * subscription.resumed → ACTIVE.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionResumed(entity: any): Promise<void> {
  const subscriptionId = entity?.id;
  if (!subscriptionId) {
    throw new PermanentWebhookError("subscription.resumed: missing subscription ID");
  }

  const result = await prisma.subscription.updateMany({
    where: { razorpaySubscriptionId: subscriptionId },
    data: { status: "ACTIVE" },
  });

  if (result.count === 0) {
    throw new Error(`subscription.resumed: No subscription found for razorpaySubscriptionId=${subscriptionId}. Razorpay will retry.`);
  }
}
