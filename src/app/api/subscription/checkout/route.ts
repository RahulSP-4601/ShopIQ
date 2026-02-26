import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getUserSession } from "@/lib/auth/session";
import { getRazorpay, getOrCreateCustomer, getOrCreatePlan, createSubscription, cancelSubscription } from "@/lib/razorpay/client";
import { calculateMonthlyPrice } from "@/lib/subscription/pricing";

const checkoutSchema = z.object({
  marketplaceCount: z.number().int("Must be a whole number").min(1, "At least 1 marketplace is required"),
});

/**
 * POST /api/subscription/checkout
 *
 * Creates a Razorpay Subscription for the authenticated user.
 * Returns subscription ID and key for client-side Checkout.js modal.
 *
 * Flow:
 * 1. Short serialized transaction (FOR UPDATE) to check/lock state
 * 2. External Razorpay API calls OUTSIDE the transaction
 * 3. Idempotent DB persist with conflict handling
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (parseError) {
      if (parseError instanceof SyntaxError || (parseError instanceof Error && parseError.name === "SyntaxError")) {
        return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
      }
      throw parseError;
    }
    const result = checkoutSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { marketplaceCount } = result.data;
    const totalPricePaise = calculateMonthlyPrice(marketplaceCount);

    // Look up user
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Validate Razorpay key before making any external API calls (fail-fast)
    const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!razorpayKeyId) {
      console.error("NEXT_PUBLIC_RAZORPAY_KEY_ID is not set");
      return NextResponse.json(
        { error: "Payment gateway not configured" },
        { status: 500 }
      );
    }

    // ── Step 1: Short serialized transaction to check state ────────────
    // Uses advisory lock + FOR UPDATE to prevent concurrent checkouts.
    // Advisory lock is needed because FOR UPDATE can't lock non-existent rows —
    // without it, two concurrent requests for a user with no Subscription row
    // would both see null and both proceed to create Razorpay subscriptions.
    // pg_advisory_xact_lock auto-releases when the transaction commits/rolls back.
    const lockResult = await prisma.$transaction(async (tx) => {
      // Acquire per-user advisory lock (serializes concurrent checkouts for the same user)
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;

      // Acquire row lock via FOR UPDATE (or return null if no row exists)
      const rows = await tx.$queryRaw<Array<{
        id: string;
        status: string;
        razorpaySubscriptionId: string | null;
        razorpayCustomerId: string | null;
        marketplaceCount: number;
      }>>(
        Prisma.sql`SELECT "id", "status", "razorpaySubscriptionId", "razorpayCustomerId", "marketplaceCount"
                   FROM "Subscription"
                   WHERE "userId" = ${user.id}
                   FOR UPDATE`
      );

      const existingSub = rows[0] ?? null;

      // If user has an ACTIVE or TRIAL subscription, they shouldn't be checking out again
      if (
        existingSub &&
        (existingSub.status === "ACTIVE" || existingSub.status === "TRIAL")
      ) {
        return { action: "already_active" as const };
      }

      // If user has an UNPAID subscription with a Razorpay ID
      if (
        existingSub?.razorpaySubscriptionId &&
        existingSub.status === "UNPAID"
      ) {
        // If marketplace count matches, the previous checkout is still valid — reuse it
        if (existingSub.marketplaceCount === marketplaceCount) {
          return {
            action: "reuse_existing" as const,
            subscriptionId: existingSub.razorpaySubscriptionId,
          };
        }

        // Marketplace count differs — cancel the stale Razorpay subscription
        // and proceed to create a new one
        return {
          action: "cancel_stale" as const,
          staleRazorpaySubId: existingSub.razorpaySubscriptionId,
          existingCustomerId: existingSub.razorpayCustomerId,
          existingDbId: existingSub.id,
        };
      }

      // No subscription or subscription without Razorpay ID — need to create
      return {
        action: "create_new" as const,
        existingCustomerId: existingSub?.razorpayCustomerId ?? null,
      };
    });

    // ── Handle early returns ───────────────────────────────────────────
    let existingCustomerId: string | null = null;

    if (lockResult.action === "already_active") {
      return NextResponse.json(
        { error: "You already have an active subscription" },
        { status: 409 }
      );
    }

    if (lockResult.action === "reuse_existing") {
      // Verify the cached Razorpay subscription is still in a usable state
      // before returning it to the client (it may have been cancelled/expired externally).
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rzpSub = await (getRazorpay().subscriptions as any).fetch(lockResult.subscriptionId);
        const usableStates = new Set(["created", "authenticated", "active"]);
        if (rzpSub?.status && usableStates.has(rzpSub.status)) {
          return NextResponse.json({
            subscriptionId: lockResult.subscriptionId,
            razorpayKeyId,
            amount: totalPricePaise,
            currency: "INR",
            name: user.name,
            email: user.email,
          });
        }
        // Subscription is cancelled/expired/halted — clear stale DB reference and fall through
        // to create a new one
        console.warn(
          `Reuse check: Razorpay subscription ${lockResult.subscriptionId} is in state "${rzpSub?.status}" — creating new subscription`
        );
        try {
          await prisma.subscription.updateMany({
            where: { userId: user.id, razorpaySubscriptionId: lockResult.subscriptionId },
            data: { razorpaySubscriptionId: null, status: "UNPAID" },
          });
        } catch (dbError) {
          console.error(
            `Failed to clear stale razorpaySubscriptionId in DB — aborting checkout to prevent duplicate subscriptions:`,
            { userId: user.id, razorpaySubscriptionId: lockResult.subscriptionId, error: dbError }
          );
          return NextResponse.json(
            { error: "Failed to prepare checkout. Please try again." },
            { status: 500 }
          );
        }
      } catch (fetchError) {
        // Razorpay fetch failed — clear stale DB reference before creating a new subscription
        console.error("Failed to verify existing Razorpay subscription status:", fetchError);
        try {
          await prisma.subscription.updateMany({
            where: { userId: user.id, razorpaySubscriptionId: lockResult.subscriptionId },
            data: { razorpaySubscriptionId: null, status: "UNPAID" },
          });
        } catch (dbError) {
          console.error(
            `Failed to clear stale razorpaySubscriptionId in DB — aborting checkout to prevent duplicate subscriptions:`,
            { userId: user.id, razorpaySubscriptionId: lockResult.subscriptionId, error: dbError }
          );
          return NextResponse.json(
            { error: "Failed to prepare checkout. Please try again." },
            { status: 500 }
          );
        }
      }
      // Fall through to create_new path — fetch existing customer ID for reuse
      const existingSub = await prisma.subscription.findUnique({
        where: { userId: user.id },
        select: { razorpayCustomerId: true },
      });
      existingCustomerId = existingSub?.razorpayCustomerId ?? null;
    }

    // ── Step 2: Cancel stale subscription if marketplace count changed ─
    if (lockResult.action === "cancel_stale") {
      existingCustomerId = lockResult.existingCustomerId;
      try {
        await cancelSubscription(lockResult.staleRazorpaySubId, false);
      } catch (cancelError) {
        console.error("Failed to cancel stale Razorpay subscription:", cancelError);
        // Continue anyway — the stale subscription may already be cancelled
      }
      // Mark DB row as cancelled so it can be overwritten
      try {
        await prisma.subscription.update({
          where: { id: lockResult.existingDbId },
          data: { status: "CANCELED", razorpaySubscriptionId: null },
        });
      } catch (dbError) {
        console.error(
          `Failed to mark stale subscription as CANCELED (id=${lockResult.existingDbId}):`,
          dbError
        );
        return NextResponse.json(
          { error: "Failed to prepare checkout. Please try again." },
          { status: 500 }
        );
      }
    } else if (lockResult.action === "create_new") {
      existingCustomerId = lockResult.existingCustomerId;
    }
    // For reuse_existing fall-through, existingCustomerId is already set above

    // ── Step 3: External Razorpay API calls OUTSIDE the transaction ───
    const customerId = await getOrCreateCustomer(
      user.email,
      user.name,
      existingCustomerId
    );

    const planId = await getOrCreatePlan(totalPricePaise / 100);

    const razorpaySubscription = await createSubscription({
      planId,
      customerId,
      userId: user.id,
      totalCount: 0,
      marketplaceCount,
    });

    // ── Step 4: Idempotent DB persist ─────────────────────────────────
    // Uses upsert so concurrent requests that both created Razorpay subscriptions
    // will have the last-writer win on the DB row. The loser's Razorpay subscription
    // is orphaned but won't charge since it's never completed by the user.
    try {
      await prisma.subscription.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          razorpayCustomerId: customerId,
          razorpaySubscriptionId: razorpaySubscription.id,
          razorpayPlanId: planId,
          status: "UNPAID",
          marketplaceCount,
          totalPrice: totalPricePaise / 100,
        },
        update: {
          razorpayCustomerId: customerId,
          razorpaySubscriptionId: razorpaySubscription.id,
          razorpayPlanId: planId,
          status: "UNPAID",
          marketplaceCount,
          totalPrice: totalPricePaise / 100,
        },
      });
    } catch (dbError) {
      // DB persist failed — cancel the orphaned Razorpay subscription
      console.error("DB upsert failed after Razorpay subscription creation, cancelling orphan:", dbError);
      try {
        await cancelSubscription(razorpaySubscription.id, false);
      } catch (cancelError) {
        console.error("Failed to cancel orphaned Razorpay subscription:", cancelError);
      }
      throw dbError;
    }

    return NextResponse.json({
      subscriptionId: razorpaySubscription.id,
      razorpayKeyId,
      amount: totalPricePaise,
      currency: "INR",
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Razorpay checkout error: ${message}`);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
