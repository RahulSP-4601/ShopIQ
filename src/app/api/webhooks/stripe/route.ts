import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { constructWebhookEvent } from "@/lib/stripe/client";

/**
 * Permanent webhook errors that should NOT be retried by Stripe.
 * Examples: missing metadata, validation failures, bad payloads.
 */
class PermanentWebhookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentWebhookError";
  }
}

/**
 * Stripe Webhook Handler
 *
 * Handles subscription lifecycle events from Stripe:
 * - checkout.session.completed  → Activate subscription after payment
 * - invoice.paid                → Renew billing period
 * - invoice.payment_failed      → Mark subscription as PAST_DUE
 * - customer.subscription.updated → Sync status changes
 * - customer.subscription.deleted → Cancel subscription
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    const rawBody = await request.text();
    event = constructWebhookEvent(rawBody, signature);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Stripe webhook signature verification failed: ${message}`);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        // Ignore unhandled event types
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (error instanceof PermanentWebhookError) {
      // Permanent failure — return 200 so Stripe stops retrying
      console.error(`Stripe webhook permanent error (${event.type}): ${message}`);
      return NextResponse.json({ received: true, error: "Permanent failure" });
    }
    // Transient failure — return 500 so Stripe retries
    console.error(`Stripe webhook transient error (${event.type}): ${message}`);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Checkout completed — activate subscription and link Stripe IDs.
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const userId = session.metadata?.userId;
  if (!userId) {
    throw new PermanentWebhookError(
      `Stripe checkout.session.completed: missing userId in metadata (session.id=${session.id})`
    );
  }

  const stripeSubscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  const stripeCustomerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  // Only set Stripe IDs when we actually have values — avoid overwriting
  // existing IDs with null/undefined if the session doesn't include them
  const updateData: Record<string, unknown> = { status: "ACTIVE" };
  if (stripeCustomerId) updateData.stripeCustomerId = stripeCustomerId;
  if (stripeSubscriptionId) updateData.stripeSubscriptionId = stripeSubscriptionId;

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      status: "ACTIVE",
      stripeCustomerId: stripeCustomerId ?? null,
      stripeSubscriptionId: stripeSubscriptionId ?? null,
    },
    update: updateData,
  });
}

/**
 * Invoice paid — renew the billing period.
 */
async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const stripeSubscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;

  if (!stripeSubscriptionId) return;

  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId },
  });

  if (!subscription) {
    // Throw so Stripe retries — checkout.session.completed may not have been processed yet
    throw new Error(
      `Stripe invoice.paid: No subscription found for stripeSubscriptionId=${stripeSubscriptionId}. ` +
      `This may be a race condition with checkout.session.completed — Stripe will retry.`
    );
  }

  const firstLine = invoice.lines?.data?.[0];
  const periodStart = firstLine?.period?.start;
  const periodEnd = firstLine?.period?.end;
  const updateData: Record<string, unknown> = {
    status: "ACTIVE",
  };

  if (periodEnd && typeof periodEnd === "number") {
    if (periodStart && typeof periodStart === "number") {
      updateData.currentPeriodStart = new Date(periodStart * 1000);
    }
    updateData.currentPeriodEnd = new Date(periodEnd * 1000);
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: updateData,
  });
}

/**
 * Invoice payment failed — mark as PAST_DUE.
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const stripeSubscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;

  if (!stripeSubscriptionId) return;

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId },
    data: { status: "PAST_DUE" },
  });
}

/**
 * Subscription updated — sync status from Stripe.
 */
async function handleSubscriptionUpdated(
  stripeSubscription: Stripe.Subscription
): Promise<void> {
  const statusMap: Record<string, string> = {
    active: "ACTIVE",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    unpaid: "UNPAID",
    trialing: "TRIAL",
    incomplete: "PAST_DUE",
    incomplete_expired: "CANCELED",
    paused: "PAUSED",
  };

  const mappedStatus = statusMap[stripeSubscription.status];
  if (!mappedStatus) {
    throw new PermanentWebhookError(
      `Stripe subscription.updated: unmapped status "${stripeSubscription.status}" for subscription ${stripeSubscription.id}`
    );
  }

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: stripeSubscription.id },
    data: { status: mappedStatus as "ACTIVE" | "PAST_DUE" | "CANCELED" | "UNPAID" | "TRIAL" | "PAUSED" },
  });
}

/**
 * Subscription deleted — cancel in our DB.
 */
async function handleSubscriptionDeleted(
  stripeSubscription: Stripe.Subscription
): Promise<void> {
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: stripeSubscription.id },
    data: { status: "CANCELED" },
  });
}
