import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/auth/session";
import { getOrCreateCustomer, createCheckoutSession } from "@/lib/stripe/client";

const checkoutSchema = z.object({
  marketplaceCount: z.number().int("Must be a whole number").min(1, "At least 1 marketplace is required"),
});

/**
 * POST /api/subscription/checkout
 *
 * Creates a Stripe Checkout session for the authenticated user.
 * Returns the checkout URL for client-side redirect.
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

    // Look up user and existing subscription
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { subscription: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Validate Stripe price ID is configured
    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      console.error("STRIPE_PRICE_ID environment variable is not set");
      return NextResponse.json(
        { error: "Payment configuration incomplete" },
        { status: 500 }
      );
    }

    // Get or create Stripe customer (external API call — keep outside transaction
    // to avoid holding a DB connection during network I/O)
    const customerId = await getOrCreateCustomer(
      user.email,
      user.name,
      user.subscription?.stripeCustomerId
    );

    // Persist the Stripe customer ID atomically
    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        stripeCustomerId: customerId,
        status: "UNPAID",
      },
      update: {
        stripeCustomerId: customerId,
      },
    });

    // Build success/cancel URLs
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const successUrl = `${appUrl}/chat?checkout=success`;
    const cancelUrl = `${appUrl}/onboarding/payment?checkout=canceled`;

    // Create Stripe Checkout session
    const checkoutSession = await createCheckoutSession({
      customerId,
      priceId,
      quantity: marketplaceCount,
      successUrl,
      cancelUrl,
      userId: user.id,
    });

    if (!checkoutSession.url) {
      console.error("Stripe checkout session created but url is null");
      return NextResponse.json(
        { error: "Checkout session created but no redirect URL was returned" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      url: checkoutSession.url,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Stripe checkout error: ${message}`);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
