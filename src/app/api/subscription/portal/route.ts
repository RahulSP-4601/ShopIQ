import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/auth/session";
import { createPortalSession } from "@/lib/stripe/client";

/**
 * POST /api/subscription/portal
 *
 * Creates a Stripe Customer Portal session so the user can manage
 * their subscription (update payment method, cancel, etc.).
 * Returns the portal URL for client-side redirect.
 */
export async function POST() {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.userId },
      select: { stripeCustomerId: true },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "No subscription record found" },
        { status: 404 }
      );
    }

    if (!subscription.stripeCustomerId) {
      return NextResponse.json(
        { error: "Subscription exists but Stripe customer ID is missing — complete checkout first" },
        { status: 422 }
      );
    }

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const portalSession = await createPortalSession(
      subscription.stripeCustomerId,
      `${appUrl}/account/marketplaces`
    );

    if (!portalSession?.url) {
      console.error("Stripe portal session returned without a URL");
      return NextResponse.json(
        { error: "Portal session URL unavailable" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Stripe portal error: ${message}`);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
