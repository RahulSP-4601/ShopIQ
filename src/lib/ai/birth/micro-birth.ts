import { upsertBelief } from "../memory/beliefs";

// -------------------------------------------------------
// Rate Limiting (per-conversation, in-memory)
// -------------------------------------------------------

interface BirthEntry {
  count: number;
  lastSeenAt: number;
}

// NOTE: Single-instance only — not shared across serverless/container instances.
// This is intentional: micro-beliefs are idempotent (upsertBelief uses CAS),
// so cross-instance over-creation is harmless and converges to the same state.
const conversationBirthCounts = new Map<string, BirthEntry>();
const MAX_MICRO_BIRTHS_PER_CONVERSATION = 3;
const MAX_MAP_SIZE = 1000;
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes
const STALE_THRESHOLD = 30 * 60 * 1000; // 30 minutes — evict entries not seen in this window
let lastCleanup = Date.now();

function cleanupOldEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  // Remove stale entries (not seen within STALE_THRESHOLD)
  for (const [key, entry] of conversationBirthCounts.entries()) {
    if (now - entry.lastSeenAt > STALE_THRESHOLD) {
      conversationBirthCounts.delete(key);
    }
  }

  // If still over limit, evict oldest entries by lastSeenAt
  if (conversationBirthCounts.size > MAX_MAP_SIZE) {
    const sorted = [...conversationBirthCounts.entries()]
      .sort((a, b) => a[1].lastSeenAt - b[1].lastSeenAt);
    for (const [key] of sorted) {
      if (conversationBirthCounts.size <= MAX_MAP_SIZE) break;
      conversationBirthCounts.delete(key);
    }
  }
}

/**
 * Atomic check-and-increment to prevent TOCTOU race between
 * canCreateMicroBelief() and recordMicroBirth().
 * Returns true if a slot was reserved, false if limit reached.
 */
function tryReserveMicroBirth(conversationKey: string): boolean {
  cleanupOldEntries();
  const existing = conversationBirthCounts.get(conversationKey);
  const count = existing?.count || 0;
  if (count >= MAX_MICRO_BIRTHS_PER_CONVERSATION) return false;
  conversationBirthCounts.set(conversationKey, {
    count: count + 1,
    lastSeenAt: Date.now(),
  });
  return true;
}

/**
 * Release a previously reserved micro-birth slot (e.g., when upsertBelief fails).
 */
function releaseMicroBirthSlot(conversationKey: string): void {
  const entry = conversationBirthCounts.get(conversationKey);
  if (entry && entry.count > 0) {
    entry.count--;
    entry.lastSeenAt = Date.now();
  }
}

// -------------------------------------------------------
// Pattern Detection from Tool Results
// -------------------------------------------------------

interface PatternMatch {
  statement: string;
  contextKey: string;
  strength: number;
}

/**
 * Detect patterns from a tool result that should create micro-beliefs.
 * Returns null if no interesting pattern is found.
 */
function detectPattern(
  toolName: string,
  toolResult: string
): PatternMatch | null {
  try {
    // Only analyze specific tools that produce structured data
    switch (toolName) {
      case "get_revenue_metrics":
        return detectRevenuePattern(toolResult);
      case "get_top_products":
        return detectProductPattern(toolResult);
      case "get_low_stock_products":
        return detectInventoryPattern(toolResult);
      case "get_channel_comparison":
        return detectChannelPattern(toolResult);
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function detectRevenuePattern(result: string): PatternMatch | null {
  const data = JSON.parse(result);
  if (!data || typeof data !== "object") return null;

  const totalRevenue = Number(data.totalRevenue);
  const totalOrders = Number(data.totalOrders);

  // High revenue business
  if (Number.isFinite(totalRevenue) && totalRevenue > 100000) {
    return {
      statement: "high_revenue_business",
      contextKey: "*",
      strength: 0.55,
    };
  }

  // Growing orders
  if (Number.isFinite(totalOrders) && totalOrders > 500) {
    return {
      statement: "high_order_volume",
      contextKey: "*",
      strength: 0.55,
    };
  }

  return null;
}

function detectProductPattern(result: string): PatternMatch | null {
  const data = JSON.parse(result);
  if (!Array.isArray(data) || data.length === 0) return null;

  // Check for dominant product (>40% of total revenue)
  // Coerce revenue to number to prevent string concatenation
  const totalRevenue = data.reduce(
    (sum: number, p: { revenue?: number | string }) => {
      const rev = Number(p.revenue);
      const safeRev = Number.isFinite(rev) ? rev : 0;
      return sum + safeRev;
    },
    0
  );
  if (totalRevenue > 0) {
    // Find the actual maximum revenue among all items (don't assume data[0] is top)
    const maxRevenue = data.reduce(
      (max: number, p: { revenue?: number | string }) => {
        const rev = Number(p.revenue);
        const safeRev = Number.isFinite(rev) ? rev : 0;
        return Math.max(max, safeRev);
      },
      0
    );
    if (maxRevenue > 0) {
      const topProductShare = maxRevenue / totalRevenue;
      if (topProductShare > 0.4) {
        return {
          statement: "single_product_dominates_revenue",
          contextKey: "*",
          strength: 0.55,
        };
      }
    }
  }

  return null;
}

function detectInventoryPattern(result: string): PatternMatch | null {
  const data = JSON.parse(result);
  if (!Array.isArray(data)) return null;

  // Many low-stock items
  if (data.length > 10) {
    return {
      statement: "widespread_inventory_issues",
      contextKey: "*",
      strength: 0.60,
    };
  }

  return null;
}

function detectChannelPattern(result: string): PatternMatch | null {
  const data = JSON.parse(result);
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;

  // Check for multi-channel data presence (object keys = channel names)
  const channels = Object.keys(data);
  if (channels.length > 1) {
    return {
      statement: "cross_channel_insights",
      contextKey: "*",
      strength: 0.55,
    };
  }

  return null;
}

// -------------------------------------------------------
// Main: Maybe Create Micro-Belief
// -------------------------------------------------------

/**
 * After tool execution, detect patterns and auto-create contextual beliefs.
 * Lightweight, fire-and-forget — errors are silently caught.
 * Rate-limited to MAX_MICRO_BIRTHS_PER_CONVERSATION per conversation.
 *
 * @param userId - The user ID
 * @param toolName - The tool that was executed
 * @param toolResult - The tool result string
 * @param conversationId - Optional conversation ID for rate limiting (defaults to userId)
 */
export async function maybeCreateMicroBelief(
  userId: string,
  toolName: string,
  toolResult: string,
  conversationId?: string
): Promise<void> {
  try {
    const trimmedConvId = typeof conversationId === "string" ? conversationId.trim() : undefined;
    const trimmedUserId = typeof userId === "string" ? userId.trim() : undefined;
    if (!trimmedUserId) return; // Need valid userId for belief storage
    const convKey = trimmedConvId || trimmedUserId;

    const pattern = detectPattern(toolName, toolResult);
    if (!pattern) return;

    // Atomic reserve: only proceed if a slot is available
    if (!tryReserveMicroBirth(convKey)) return;

    try {
      await upsertBelief(trimmedUserId, pattern.statement, pattern.contextKey, {
        strength: pattern.strength,
      });
    } catch {
      // Release slot so failed attempts don't permanently consume the limit
      releaseMicroBirthSlot(convKey);
    }
  } catch {
    // Silently ignore — micro-birth is best-effort
  }
}
