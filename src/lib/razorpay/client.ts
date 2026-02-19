import Razorpay from "razorpay";
import crypto from "crypto";
import prisma from "@/lib/prisma";

// ── Razorpay Instance (lazy) ──────────────────────────────
let razorpayClient: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (!razorpayClient) {
    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
      throw new Error("NEXT_PUBLIC_RAZORPAY_KEY_ID environment variable is not set");
    }
    if (!process.env.RAZORPAY_KEY_SECRET) {
      throw new Error("RAZORPAY_KEY_SECRET environment variable is not set");
    }
    razorpayClient = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayClient;
}

export { getRazorpay };

// ── Plan Management ───────────────────────────────────────

// In-memory cache: amountInPaise -> planId (fast path within a single instance).
// Plans are immutable on Razorpay — stale entries are always valid.
// Cross-instance dedup is handled by the RazorpayPlan DB table.
const planCache = new Map<number, string>();

// Per-amount mutex: prevents concurrent requests within the SAME instance from
// creating duplicate plans on Razorpay. Maps amountInPaise -> in-flight Promise.
// Cross-instance concurrency is handled by the RazorpayPlan DB unique constraint.
const planLocks = new Map<number, Promise<string>>();

/**
 * Convert rupees to paise safely, avoiding floating-point errors.
 * e.g., 14.48 * 100 = 1447.9999999999998, but this returns 1448.
 */
function rupeesToPaise(amountInRupees: number): number {
  return Number((amountInRupees * 100).toFixed(0));
}

/**
 * Get or create a Razorpay Plan for a given monthly amount.
 * Creates one plan per unique price point (e.g., ₹999 → plan_xxx, ₹1448 → plan_yyy).
 * Uses a per-amount mutex to prevent concurrent duplicate plan creation.
 *
 * @param amountInRupees - Monthly subscription amount in INR (e.g., 999, 1448)
 * @returns Razorpay plan ID
 */
export async function getOrCreatePlan(amountInRupees: number): Promise<string> {
  if (!Number.isFinite(amountInRupees) || amountInRupees <= 0) {
    throw new RangeError(
      `getOrCreatePlan: amountInRupees must be a finite number > 0, got ${amountInRupees}`
    );
  }

  const amountInPaise = rupeesToPaise(amountInRupees);

  // Fast path: check cache without locking
  if (planCache.has(amountInPaise)) {
    return planCache.get(amountInPaise)!;
  }

  // If another request is already looking up/creating this plan, wait for it
  const existingLock = planLocks.get(amountInPaise);
  if (existingLock) {
    return existingLock;
  }

  // Create a new lock for this amount
  const lockPromise = getOrCreatePlanInternal(amountInRupees, amountInPaise);
  planLocks.set(amountInPaise, lockPromise);

  try {
    const planId = await lockPromise;
    return planId;
  } finally {
    planLocks.delete(amountInPaise);
  }
}

/**
 * Internal implementation — only called when the per-amount lock is held.
 * Uses a 3-layer lookup: in-memory cache → DB → Razorpay API.
 * DB layer (RazorpayPlan table) provides cross-instance dedup in serverless/multi-instance deployments.
 */
async function getOrCreatePlanInternal(amountInRupees: number, amountInPaise: number): Promise<string> {
  // Re-check in-memory cache (another request may have populated it while we awaited the lock)
  if (planCache.has(amountInPaise)) {
    return planCache.get(amountInPaise)!;
  }

  // Layer 2: Cross-instance lookup via database
  const dbPlan = await prisma.razorpayPlan.findUnique({
    where: { amountInPaise },
  });
  if (dbPlan) {
    planCache.set(amountInPaise, dbPlan.razorpayPlanId);
    return dbPlan.razorpayPlanId;
  }

  // Layer 3: Paginated search on Razorpay API
  const PAGE_SIZE = 100;
  let skip = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let existing: any = null;

  while (!existing) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plans = await (getRazorpay().plans as any).all({ count: PAGE_SIZE, skip });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    existing = plans.items?.find((p: any) =>
      p.item?.amount === amountInPaise &&
      p.period === "monthly" &&
      p.interval === 1 &&
      p.item?.currency === "INR"
    );

    if (existing) break;

    // No more pages — stop searching
    if (!plans.items || plans.items.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  if (existing) {
    await persistPlanToDb(amountInPaise, existing.id);
    planCache.set(amountInPaise, existing.id);
    return existing.id;
  }

  // Create new plan on Razorpay
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plan = await (getRazorpay().plans as any).create({
    period: "monthly",
    interval: 1,
    item: {
      name: `Frame Pro - ₹${amountInRupees}/mo`,
      amount: amountInPaise,
      currency: "INR",
      description: `Frame multi-marketplace analytics - ₹${amountInRupees}/month`,
    },
  });

  await persistPlanToDb(amountInPaise, plan.id);
  planCache.set(amountInPaise, plan.id);
  return plan.id;
}

/**
 * Persist a Razorpay plan mapping to the database for cross-instance reuse.
 * Uses P2002 catch for idempotency — if another instance already inserted, that's fine.
 */
async function persistPlanToDb(amountInPaise: number, razorpayPlanId: string): Promise<void> {
  try {
    await prisma.razorpayPlan.create({
      data: { amountInPaise, razorpayPlanId },
    });
  } catch (err: unknown) {
    const prismaError = err as { code?: string };
    if (prismaError.code === "P2002") {
      // Another instance already inserted — plans are immutable, so this is fine
    } else {
      // Non-critical: plan exists on Razorpay, DB record failed.
      // In-memory cache still works for this instance; other instances will re-discover via Razorpay API.
      console.error("Failed to persist RazorpayPlan to DB:", err);
    }
  }
}

// ── Customer Management ───────────────────────────────────

/**
 * Get or create a Razorpay Customer.
 * Reuses existing razorpayCustomerId from the Subscription record if present.
 */
export async function getOrCreateCustomer(
  email: string,
  name: string,
  existingCustomerId?: string | null
): Promise<string> {
  const trimmedName = name?.trim();
  const trimmedEmail = email?.trim();
  if (!trimmedName) {
    throw new Error("getOrCreateCustomer: name must be a non-empty string");
  }
  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    throw new Error("getOrCreateCustomer: email must be a valid email address");
  }

  if (existingCustomerId) {
    try {
      // Verify customer still exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customer = await (getRazorpay().customers as any).fetch(existingCustomerId);
      if (customer?.id) {
        return existingCustomerId;
      }
    } catch (err: unknown) {
      // Narrow error shape: Razorpay SDK errors have a numeric statusCode property
      const statusCode =
        err != null && typeof err === "object" && "statusCode" in err && typeof (err as Record<string, unknown>).statusCode === "number"
          ? ((err as Record<string, unknown>).statusCode as number)
          : undefined;

      if (statusCode === 404) {
        // Customer genuinely not found on Razorpay — create a new one below
      } else {
        // Any other error (400 = validation/malformed request, 5xx, network, etc.)
        // must propagate so callers can handle or log the real failure.
        throw err;
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customer = await (getRazorpay().customers as any).create({
    name: trimmedName,
    email: trimmedEmail,
    notes: { source: "frame" },
  });

  return customer.id;
}

// ── Subscription Management ──────────────────────────────

/**
 * Create a Razorpay Subscription.
 * userId is stored in notes for webhook correlation.
 */
export async function createSubscription(params: {
  planId: string;
  customerId: string;
  userId: string;
  totalCount?: number;
  marketplaceCount: number;
}): Promise<{ id: string; short_url: string }> {
  const missing: string[] = [];
  if (!params.planId?.trim()) missing.push("planId");
  if (!params.customerId?.trim()) missing.push("customerId");
  if (!params.userId?.trim()) missing.push("userId");
  if (missing.length > 0) {
    throw new Error(`createSubscription: missing required field(s): ${missing.join(", ")}`);
  }
  if (
    !Number.isFinite(params.marketplaceCount) ||
    !Number.isInteger(params.marketplaceCount) ||
    params.marketplaceCount < 0
  ) {
    throw new Error(
      `createSubscription: marketplaceCount must be a non-negative integer, got ${params.marketplaceCount}`
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscription = await (getRazorpay().subscriptions as any).create({
    plan_id: params.planId,
    customer_id: params.customerId,
    total_count: params.totalCount ?? 0, // 0 = infinite recurring
    notes: {
      userId: params.userId,
      marketplaceCount: String(params.marketplaceCount),
    },
  });

  return { id: subscription.id, short_url: subscription.short_url };
}

/**
 * Cancel a Razorpay Subscription.
 * @param cancelAtCycleEnd - If true, cancels at end of current period (default: true)
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtCycleEnd = true
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (getRazorpay().subscriptions as any).cancel(subscriptionId, cancelAtCycleEnd);
}

/**
 * Update a Razorpay Subscription's plan (for marketplace count changes).
 */
export async function updateSubscriptionPlan(
  subscriptionId: string,
  newPlanId: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (getRazorpay().subscriptions as any).update(subscriptionId, {
    plan_id: newPlanId,
  });
}

// ── Signature Verification ───────────────────────────────

/**
 * Verify Razorpay payment signature (post-checkout verification).
 * Formula: HMAC-SHA256(razorpay_payment_id + "|" + razorpay_subscription_id, key_secret)
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyPaymentSignature(params: {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    console.error("RAZORPAY_KEY_SECRET is not set");
    return false;
  }

  const payload = params.razorpay_payment_id + "|" + params.razorpay_subscription_id;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  // Timing-safe comparison (project pattern from src/lib/shopify/webhooks.ts)
  const expectedBuf = Buffer.from(expectedSignature);
  const receivedBuf = Buffer.from(params.razorpay_signature);
  const lengthsMatch = expectedBuf.length === receivedBuf.length;
  const compareBuf = lengthsMatch ? receivedBuf : Buffer.alloc(expectedBuf.length);
  return crypto.timingSafeEqual(expectedBuf, compareBuf) && lengthsMatch;
}

/**
 * Verify Razorpay webhook signature.
 * Formula: HMAC-SHA256(rawBody, webhook_secret)
 * Uses SHA-256 digest of both sides before timingSafeEqual to prevent length leak.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("RAZORPAY_WEBHOOK_SECRET is not set");
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  // Hash both sides to SHA-256 digests before timingSafeEqual
  // (prevents length leak — per project convention)
  const expectedHash = crypto.createHash("sha256").update(expectedSignature).digest();
  const receivedHash = crypto.createHash("sha256").update(signature).digest();
  return crypto.timingSafeEqual(expectedHash, receivedHash);
}
