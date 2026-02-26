import prisma from "@/lib/prisma";
import { getUserSession } from "./session";

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  subscription: {
    status: string;
    marketplaceCount: number;
    currentPeriodEnd: Date;
  } | null;
  error?: string;
}

/**
 * Check if the current user has an active subscription
 */
export async function checkSubscription(): Promise<SubscriptionStatus> {
  const session = await getUserSession();

  if (!session) {
    return {
      hasActiveSubscription: false,
      subscription: null,
      error: "Not authenticated",
    };
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.userId },
  });

  if (!subscription) {
    return {
      hasActiveSubscription: false,
      subscription: null,
      error: "No subscription found",
    };
  }

  // Check if subscription is active
  const isActive =
    subscription.status === "ACTIVE" || subscription.status === "TRIAL";

  // Check if subscription period has expired
  const isExpired = subscription.currentPeriodEnd < new Date();

  if (!isActive || isExpired) {
    return {
      hasActiveSubscription: false,
      subscription: {
        status: subscription.status,
        marketplaceCount: subscription.marketplaceCount,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
      error: isExpired ? "Subscription has expired" : "Subscription is not active",
    };
  }

  return {
    hasActiveSubscription: true,
    subscription: {
      status: subscription.status,
      marketplaceCount: subscription.marketplaceCount,
      currentPeriodEnd: subscription.currentPeriodEnd,
    },
  };
}

/**
 * Require an active subscription - throws if not subscribed
 */
export async function requireSubscription(): Promise<void> {
  const { hasActiveSubscription, error } = await checkSubscription();

  if (!hasActiveSubscription) {
    throw new Error(error || "Active subscription required");
  }
}
