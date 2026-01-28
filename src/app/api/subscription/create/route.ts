import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/auth/session";
import { calculateMonthlyPrice, PRICING } from "@/lib/subscription/pricing";

const createSubscriptionSchema = z.object({
  marketplaceCount: z.number().min(1, "At least 1 marketplace is required"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = createSubscriptionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { marketplaceCount } = result.data;

    // Calculate pricing
    const totalPrice = calculateMonthlyPrice(marketplaceCount);

    // Calculate billing period (1 month from now)
    const currentPeriodStart = new Date();
    const year = currentPeriodStart.getFullYear();
    const month = currentPeriodStart.getMonth();
    const day = currentPeriodStart.getDate();

    const lastDayOfNextMonth = new Date(year, month + 2, 0).getDate();
    const targetDay = Math.min(day, lastDayOfNextMonth);
    const currentPeriodEnd = new Date(year, month + 1, targetDay);

    // Run everything in a single transaction
    const subscription = await prisma.$transaction(async (tx) => {
      const existingSubscription = await tx.subscription.findUnique({
        where: { userId: session.userId },
        select: { status: true },
      });

      // Block updates if subscription is CANCELED
      if (existingSubscription?.status === "CANCELED") {
        throw new Error("CANCELED");
      }

      const isTrialConversion = existingSubscription?.status === "TRIAL";

      // Build update payload — only reset billing period on trial conversion or new subscription
      const updateData: Record<string, unknown> = {
        status: "ACTIVE",
        basePrice: PRICING.BASE_PRICE,
        additionalPrice: PRICING.ADDITIONAL_PRICE,
        totalPrice,
        marketplaceCount,
      };
      if (isTrialConversion || !existingSubscription) {
        updateData.currentPeriodStart = currentPeriodStart;
        updateData.currentPeriodEnd = currentPeriodEnd;
      }

      const sub = await tx.subscription.upsert({
        where: { userId: session.userId },
        create: {
          userId: session.userId,
          status: "ACTIVE",
          basePrice: PRICING.BASE_PRICE,
          additionalPrice: PRICING.ADDITIONAL_PRICE,
          totalPrice,
          marketplaceCount,
          currentPeriodStart,
          currentPeriodEnd,
        },
        update: updateData,
      });

      // If converting from trial, update SalesClient status and create commission
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
            // Check if commission already exists for this client (idempotency)
            const existingCommission = await tx.commission.findFirst({
              where: {
                salesMemberId: salesClient.salesMemberId,
                salesClientId: salesClient.id,
                period: "INITIAL",
              },
            });

            if (!existingCommission) {
              // Use integer cents arithmetic to avoid floating-point precision errors
              const rate = Number(salesClient.salesMember.commissionRate);
              const totalPriceCents = Math.round(Number(totalPrice) * 100);
              const commissionCents = Math.round(totalPriceCents * rate / 100);
              const commissionAmount = commissionCents / 100;

              await tx.commission.create({
                data: {
                  salesMemberId: salesClient.salesMemberId,
                  salesClientId: salesClient.id,
                  amount: commissionAmount,
                  note: `Subscription purchase (client:${salesClient.id}) — $${Number(totalPrice).toFixed(2)}/mo`,
                  period: "INITIAL",
                },
              });
            }
          }
        }
      }

      return sub;
    });

    return NextResponse.json({
      success: true,
      subscription,
      redirect: "/chat",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CANCELED") {
      return NextResponse.json(
        { error: "Cannot modify a canceled subscription. Please contact support to reactivate." },
        { status: 400 }
      );
    }
    console.error("Create subscription error:", error);
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}
