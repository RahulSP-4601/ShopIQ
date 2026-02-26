import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/auth/session";
import { calculateMonthlyPrice, PRICING } from "@/lib/subscription/pricing";
import { getOrCreatePlan, updateSubscriptionPlan } from "@/lib/razorpay/client";

export async function POST() {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if subscription exists
    const existingSubscription = await prisma.subscription.findUnique({
      where: { userId: session.userId },
    });

    if (!existingSubscription) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 404 }
      );
    }

    // Query the ACTUAL connected marketplace count from database
    // Don't trust client-supplied count to prevent underbilling
    const actualMarketplaceCount = await prisma.marketplaceConnection.count({
      where: {
        userId: session.userId,
        status: "CONNECTED",
      },
    });

    if (actualMarketplaceCount < 1) {
      return NextResponse.json(
        { error: "At least 1 connected marketplace is required" },
        { status: 400 }
      );
    }

    // Calculate pricing based on authoritative count (returns paise)
    const totalPricePaise = calculateMonthlyPrice(actualMarketplaceCount);

    // If there's an active Razorpay subscription and the price changed,
    // update the plan on Razorpay.
    // DB stores rupees as Decimal(10,2); compare in paise to avoid floating-point mismatch.
    const existingPricePaise = Math.round(parseFloat(existingSubscription.totalPrice.toString()) * 100);
    const priceChanged =
      existingSubscription.razorpaySubscriptionId &&
      existingSubscription.status === "ACTIVE" &&
      existingPricePaise !== totalPricePaise;

    let newPlanId = existingSubscription.razorpayPlanId;

    if (priceChanged) {
      try {
        // Step 1: Optimistic concurrency guard — atomically set razorpaySyncPending = true
        // ONLY if it's currently false. If another concurrent request already set it,
        // updateMany returns count=0 and we abort to avoid duplicate Razorpay calls.
        const guardResult = await prisma.subscription.updateMany({
          where: {
            userId: session.userId,
            razorpaySyncPending: false,
          },
          data: { razorpaySyncPending: true },
        });

        if (guardResult.count === 0) {
          // Another concurrent request is already updating the Razorpay plan — skip
          return NextResponse.json(
            { error: "Subscription update already in progress. Please try again." },
            { status: 409 }
          );
        }

        // Step 2: Get or create Razorpay plan (only after guard confirms we won the lock)
        newPlanId = await getOrCreatePlan(totalPricePaise / 100);

        // Step 3: Call Razorpay to update the plan
        await updateSubscriptionPlan(
          existingSubscription.razorpaySubscriptionId!,
          newPlanId
        );

        // Step 4: Razorpay succeeded — update razorpayPlanId, pricing fields, and clear sync flag
        try {
          const subscription = await prisma.subscription.update({
            where: { userId: session.userId },
            data: {
              razorpayPlanId: newPlanId,
              marketplaceCount: actualMarketplaceCount,
              totalPrice: totalPricePaise / 100,
              basePrice: PRICING.BASE_PRICE,
              additionalPrice: PRICING.ADDITIONAL_PRICE,
              razorpaySyncPending: false,
            },
          });

          return NextResponse.json({ success: true, subscription });
        } catch (dbError) {
          // Razorpay succeeded but DB update failed — razorpaySyncPending stays true
          // so a reconciliation job can fix the mismatch.
          console.error(
            "Razorpay plan updated but DB pricing update failed — razorpaySyncPending remains true:",
            { userId: session.userId, newPlanId, error: dbError instanceof Error ? dbError.message : dbError }
          );
          throw dbError;
        }
      } catch (razorpayError) {
        // Check if this is a rethrown DB error from the success path above
        if ((razorpayError as { code?: string })?.code?.startsWith("P")) {
          throw razorpayError; // Prisma error — let outer catch handle
        }
        // Razorpay call failed — razorpayPlanId was never changed, so DB is still consistent.
        // Just clear razorpaySyncPending.
        console.error(
          "Failed to update Razorpay subscription plan:",
          {
            userId: session.userId,
            razorpaySubscriptionId: existingSubscription.razorpaySubscriptionId,
            desiredPricePaise: totalPricePaise,
            currentPlanId: existingSubscription.razorpayPlanId,
            error: razorpayError instanceof Error ? (razorpayError as Error).message : razorpayError,
          }
        );
        try {
          await prisma.subscription.update({
            where: { userId: session.userId },
            data: { razorpaySyncPending: false },
          });
        } catch (revertError) {
          console.error("Failed to clear razorpaySyncPending:", revertError);
        }
      }
    }

    // No price change, or Razorpay update failed — update marketplace count only
    const subscription = await prisma.subscription.update({
      where: { userId: session.userId },
      data: {
        marketplaceCount: actualMarketplaceCount,
      },
    });

    return NextResponse.json({
      success: true,
      subscription,
    });
  } catch (error) {
    console.error("Update subscription error:", error);
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 }
    );
  }
}
