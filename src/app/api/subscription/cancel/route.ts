import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/auth/session";
import { cancelSubscription } from "@/lib/razorpay/client";

/**
 * POST /api/subscription/cancel
 *
 * Cancels the user's Razorpay subscription at the end of
 * the current billing cycle (graceful cancellation).
 *
 * Uses atomic conditional update to prevent race conditions:
 * 1. Atomically transition ACTIVE → PENDING_CANCELLATION (updateMany with status guard)
 * 2. Call Razorpay cancelSubscription to cancel at cycle end
 * 3. On Razorpay failure: status remains PENDING_CANCELLATION and razorpaySyncPending
 *    is set to true — webhooks (subscription.cancelled) reconcile the authoritative state.
 *    We do NOT revert to ACTIVE because the cancellation may have been processed
 *    despite the error (network timeout, 5xx after processing, etc.).
 */
export async function POST() {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Pre-fetch subscription to validate existence and razorpaySubscriptionId
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.userId },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 404 }
      );
    }

    if (!subscription.razorpaySubscriptionId) {
      return NextResponse.json(
        { error: "No active Razorpay subscription to cancel" },
        { status: 422 }
      );
    }

    if (subscription.status === "CANCELED" || subscription.status === "PENDING_CANCELLATION") {
      return NextResponse.json(
        { error: "Subscription is already canceled or pending cancellation" },
        { status: 400 }
      );
    }

    // Step 1: Atomic conditional update — only transitions ACTIVE → PENDING_CANCELLATION
    // If two requests race, only one will match the WHERE and get count=1.
    // Includes razorpaySubscriptionId in WHERE to ensure the ID we read hasn't changed
    // between the pre-fetch and this update (prevents cancelling the wrong subscription).
    const razorpaySubId = subscription.razorpaySubscriptionId;
    const atomicResult = await prisma.subscription.updateMany({
      where: {
        userId: session.userId,
        status: "ACTIVE",
        razorpaySubscriptionId: razorpaySubId,
      },
      data: { status: "PENDING_CANCELLATION" },
    });

    if (atomicResult.count === 0) {
      // Either not ACTIVE, razorpaySubscriptionId changed, or another request already transitioned
      return NextResponse.json(
        { error: "Subscription must be active to cancel. Current status may have changed." },
        { status: 409 }
      );
    }

    // Step 2: Call Razorpay to cancel at end of billing cycle
    // razorpaySubId is guaranteed to match DB state since the atomic update succeeded.
    try {
      await cancelSubscription(razorpaySubId, true);
    } catch (razorpayError) {
      // Razorpay call failed — but it may have actually processed the cancellation
      // (network timeout, 5xx after processing, etc.). Do NOT blindly revert to ACTIVE.
      // Instead: keep PENDING_CANCELLATION and flag for reconciliation.
      // Webhooks (subscription.cancelled) will reconcile the authoritative state.
      console.error(
        `Razorpay cancelSubscription failed for user=${session.userId}, ` +
        `razorpaySubscriptionId=${razorpaySubId}. ` +
        `Keeping PENDING_CANCELLATION — webhooks will reconcile.`,
        razorpayError
      );

      try {
        await prisma.subscription.updateMany({
          where: {
            userId: session.userId,
            status: "PENDING_CANCELLATION",
          },
          data: { razorpaySyncPending: true },
        });
      } catch (flagError) {
        console.error(
          `CRITICAL: Failed to set razorpaySyncPending for user=${session.userId}:`,
          flagError
        );
      }

      return NextResponse.json(
        { error: "Cancellation request may not have reached payment provider. Your subscription status will be reconciled automatically." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Subscription will be canceled at the end of the current billing period",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Subscription cancel error: ${message}`);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
