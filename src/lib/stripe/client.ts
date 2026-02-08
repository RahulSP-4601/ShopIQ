import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-01-27.acacia",
  typescript: true,
});

/**
 * Get or create a Stripe customer for a user.
 * Reuses existing stripeCustomerId from the Subscription record if present.
 */
export async function getOrCreateCustomer(
  email: string,
  name: string,
  existingCustomerId?: string | null
): Promise<string> {
  if (existingCustomerId) {
    // Verify the customer still exists in Stripe
    try {
      const customer = await stripe.customers.retrieve(existingCustomerId);
      if (!customer.deleted) {
        return existingCustomerId;
      }
    } catch (err: unknown) {
      // Only treat "resource not found" as recoverable — rethrow all other errors
      const stripeError = err as { statusCode?: number; code?: string; type?: string };
      if (stripeError.statusCode === 404 || stripeError.code === "resource_missing") {
        // Customer was deleted in Stripe — create a new one below
      } else {
        throw err;
      }
    }
  }

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { source: "shopiq" },
  });

  return customer.id;
}

/**
 * Create a Stripe Checkout session for subscription signup.
 */
// Allowed redirect hosts for Stripe checkout success/cancel URLs
const ALLOWED_REDIRECT_HOSTS = new Set(
  (process.env.ALLOWED_REDIRECT_HOSTS || "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean)
);

function validateRedirectUrl(url: string, label: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${label} is not a valid URL: ${url.slice(0, 100)}`);
  }
  // Only allow localhost in development — prevent SSRF/DNS rebinding in production
  if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
    if (process.env.NODE_ENV === "development") {
      return;
    }
    throw new Error(`${label} hostname "${parsed.hostname}" is not allowed in production`);
  }
  const appUrl = process.env.APP_URL;
  if (appUrl) {
    try {
      const appHost = new URL(appUrl).hostname;
      if (parsed.hostname === appHost) return;
    } catch {
      // Ignore invalid APP_URL — fall through to allowlist check
    }
  }
  // Fail closed: reject if hostname is not in the allowlist (empty set = no hosts allowed)
  if (!ALLOWED_REDIRECT_HOSTS.has(parsed.hostname)) {
    throw new Error(`${label} hostname "${parsed.hostname}" is not in the allowed redirect hosts`);
  }
}

export async function createCheckoutSession(params: {
  customerId: string;
  priceId: string;
  quantity?: number;
  successUrl: string;
  cancelUrl: string;
  userId: string;
}): Promise<Stripe.Checkout.Session> {
  // Validate redirect URLs to prevent open-redirect attacks
  validateRedirectUrl(params.successUrl, "successUrl");
  validateRedirectUrl(params.cancelUrl, "cancelUrl");

  return stripe.checkout.sessions.create({
    customer: params.customerId,
    mode: "subscription",
    line_items: [
      {
        price: params.priceId,
        quantity: params.quantity ?? 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      userId: params.userId,
    },
    subscription_data: {
      metadata: {
        userId: params.userId,
      },
    },
  });
}

/**
 * Create a Stripe Customer Portal session for managing subscriptions.
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  validateRedirectUrl(returnUrl, "returnUrl");
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

/**
 * Construct and verify a Stripe webhook event from the raw body and signature.
 */
export function constructWebhookEvent(
  rawBody: string,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET environment variable is not set");
  }
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}
