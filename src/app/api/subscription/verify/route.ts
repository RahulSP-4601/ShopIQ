import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/auth/session";
import { verifyPaymentSignature } from "@/lib/razorpay/client";
import { PRICING, calculateMonthlyPrice } from "@/lib/subscription/pricing";

const verifySchema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_subscription_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

/**
 * POST /api/subscription/verify
 *
 * Verifies the Razorpay payment signature after the user completes
 * checkout in the Razorpay Checkout.js modal.
 * Activates the subscription on success.
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
    } catch {
      return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
    }

    const result = verifySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = result.data;

    // Verify signature
    const isValid = verifyPaymentSignature({
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
    });

    if (!isValid) {
      console.error(
        `Payment signature verification failed for user=${session.userId}, ` +
        `subscription=${razorpay_subscription_id}`
      );
      return NextResponse.json(
        { error: "Payment verification failed" },
        { status: 400 }
      );
    }

    // Activate subscription in a transaction (handles trial conversion)
    // Subscription ID validation is performed INSIDE the transaction to prevent TOCTOU.
    const now = new Date();
    // Safe month-add that handles rollover (e.g., Jan 31 → Feb 28, not Mar 3)
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    if (periodEnd.getMonth() !== (now.getMonth() + 1) % 12) {
      // Rolled over — clamp to last day of target month
      periodEnd.setDate(0); // Sets to last day of previous month (i.e. the target month)
    }

    const txResult = await prisma.$transaction(async (tx) => {
      const existing = await tx.subscription.findUnique({
        where: { userId: session.userId },
        select: { status: true, marketplaceCount: true, razorpaySubscriptionId: true },
      });

      if (!existing) {
        return { error: "No subscription found", status: 404 } as const;
      }

      if (existing.razorpaySubscriptionId !== razorpay_subscription_id) {
        console.error(
          `Subscription ID mismatch: DB has ${existing.razorpaySubscriptionId}, ` +
          `client sent ${razorpay_subscription_id} for user=${session.userId}`
        );
        return { error: "Subscription mismatch", status: 400 } as const;
      }

      const isTrialConversion = existing.status === "TRIAL";
      const marketplaceCount = existing.marketplaceCount ?? 2;
      const totalPricePaise = calculateMonthlyPrice(marketplaceCount);

      // Idempotency guard: only reset periods if not already ACTIVE with a valid period.
      // A duplicate verify call (e.g., user double-clicks, network retry) should not
      // overwrite an already-active subscription's billing period.
      const alreadyActive = existing.status === "ACTIVE";

      if (alreadyActive) {
        // Already activated (likely by a prior verify or webhook) — return current state
        const currentSub = await tx.subscription.findUnique({
          where: { userId: session.userId },
        });
        return { subscription: currentSub!, alreadyActive: true } as const;
      }

      const sub = await tx.subscription.update({
        where: { userId: session.userId },
        data: {
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          basePrice: PRICING.BASE_PRICE,
          additionalPrice: PRICING.ADDITIONAL_PRICE,
          totalPrice: totalPricePaise / 100,
        },
      });

      // Handle trial-to-paid conversion (same logic as /api/subscription/create)
      if (isTrialConversion) {
        const salesClient = await tx.salesClient.findUnique({
          where: { clientUserId: session.userId },
          include: { salesMember: true },
        });

        if (salesClient && salesClient.status === "CONTACTED") {
          await tx.salesClient.update({
            where: { id: salesClient.id },
            data: { status: "CONVERTED" },
          });

          if (salesClient.salesMember?.commissionRate) {
            const existingCommission = await tx.commission.findFirst({
              where: {
                salesMemberId: salesClient.salesMemberId,
                salesClientId: salesClient.id,
                period: "INITIAL",
              },
            });

            if (!existingCommission) {
              // commissionRate is stored as Decimal(5,2) — always whole-number percent (e.g., 10 = 10%).
              // Always divide by 100 to get the fractional multiplier.
              const rawRate = Number(salesClient.salesMember.commissionRate);
              const normalizedRate = (Number.isFinite(rawRate) ? rawRate : 0) / 100;
              const commissionPaise = Math.round(totalPricePaise * normalizedRate);
              const commissionAmount = commissionPaise / 100;

              await tx.commission.create({
                data: {
                  salesMemberId: salesClient.salesMemberId,
                  salesClientId: salesClient.id,
                  amount: commissionAmount,
                  note: `Subscription purchase (client:${salesClient.id}) — ${PRICING.CURRENCY_SYMBOL}${Math.round(totalPricePaise / 100)}/mo`,
                  period: "INITIAL",
                },
              });
            }
          }
        }
      }

      return { subscription: sub } as const;
    });

    // Handle early-return errors from inside the transaction
    if ("error" in txResult) {
      return NextResponse.json(
        { error: txResult.error },
        { status: txResult.status }
      );
    }

    return NextResponse.json({
      success: true,
      subscription: txResult.subscription,
      redirect: "/chat",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Payment verification error: ${message}`);
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 }
    );
  }
}
