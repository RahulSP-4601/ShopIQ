import prisma from "@/lib/prisma";

// -------------------------------------------------------
// Constants (from Forrest Hosten's research)
// -------------------------------------------------------

const ALPHA = 0.15; // Base learning rate
const BETA_VIOLATION = 2.0; // Failures weight 2x (moral asymmetry)
const BETA_CONFIRMATION = 1.0; // Successes weight 1x

// -------------------------------------------------------
// Tool → Belief Statement Mapping
// -------------------------------------------------------

export const TOOL_BELIEF_MAP: Record<string, string> = {
  get_revenue_metrics: "analyze_revenue",
  get_top_products: "analyze_products",
  get_top_customers: "analyze_customers",
  get_daily_revenue: "analyze_daily_trends",
  get_store_overview: "describe_store_status",
  get_low_stock_products: "detect_low_stock",
  get_channel_comparison: "compare_channels",
  compare_periods: "compare_periods",
  get_product_profitability: "analyze_profitability",
  get_demand_forecast: "forecast_demand",
  get_order_status_breakdown: "analyze_fulfillment",
  get_geographic_insights: "analyze_geography",
  create_note: "manage_notes",
  get_my_notes: "manage_notes",
  dismiss_note: "manage_notes",
};

// -------------------------------------------------------
// Autonomy Mode Mapping
// -------------------------------------------------------

export function strengthToAutonomyMode(
  strength: number
): "AUTONOMOUS" | "PROPOSAL" | "GUIDANCE_SEEKING" {
  if (strength > 0.7) return "AUTONOMOUS";
  if (strength >= 0.4) return "PROPOSAL";
  return "GUIDANCE_SEEKING";
}

// -------------------------------------------------------
// Context Key Normalization
// -------------------------------------------------------

/**
 * Normalize contextKey to match buildContextKey encoding format.
 * Splits on "|", decodes each segment (if percent-encoded), then re-encodes
 * with encodeURIComponent. Treats "*" as wildcard and leaves it unencoded.
 */
function normalizeContextKey(contextKey: string): string {
  return contextKey
    .split("|")
    .map((segment) => {
      if (segment === "*") return "*";

      // Try to decode if already percent-encoded, then re-encode for consistency
      try {
        const decoded = decodeURIComponent(segment);
        return encodeURIComponent(decoded);
      } catch (decodeError) {
        // If decode fails (malformed encoding like "%ZZ"), log warning and return unchanged
        // to avoid altering malformed input (encoding would turn "%ZZ" into "%25ZZ", causing key mismatches)
        const maskedSegment = segment.length > 4
          ? `${segment.slice(0, 2)}…${segment.slice(-2)}`
          : "***";
        console.warn(
          `normalizeContextKey: Failed to decode segment (${maskedSegment}, len=${segment.length}) ` +
          `in contextKey (${contextKey.length} chars, ${contextKey.split("|").length} segments). ` +
          `Returning segment unchanged to prevent key mismatch. ` +
          `Error: ${decodeError instanceof Error ? decodeError.message : String(decodeError)}`
        );
        return segment; // Return original malformed segment unchanged
      }
    })
    .join("|");
}

// -------------------------------------------------------
// CRUD Operations
// -------------------------------------------------------

export async function getBeliefs(userId: string, minStrength = 0) {
  return prisma.belief.findMany({
    where: {
      userId,
      ...(minStrength > 0 ? { strength: { gte: minStrength } } : {}),
    },
    orderBy: { strength: "desc" },
  });
}

export async function getBelief(
  userId: string,
  statement: string,
  contextKey = "*"
) {
  const normalizedContextKey = normalizeContextKey(contextKey);
  return prisma.belief.findUnique({
    where: {
      userId_statement_contextKey: { userId, statement, contextKey: normalizedContextKey },
    },
  });
}

export async function upsertBelief(
  userId: string,
  statement: string,
  contextKey = "*",
  data?: { strength?: number }
) {
  const normalizedContextKey = normalizeContextKey(contextKey);
  const strength = data?.strength ?? 0.5;
  // Only update strength/autonomyMode when the caller explicitly provided a strength value
  const updatePayload =
    data?.strength !== undefined
      ? { strength, autonomyMode: strengthToAutonomyMode(strength) }
      : {}; // Don't overwrite existing belief on conflict
  return prisma.belief.upsert({
    where: {
      userId_statement_contextKey: { userId, statement, contextKey: normalizedContextKey },
    },
    create: {
      userId,
      statement,
      contextKey: normalizedContextKey,
      strength,
      autonomyMode: strengthToAutonomyMode(strength),
    },
    update: updatePayload,
  });
}

// -------------------------------------------------------
// Moral Asymmetry Belief Update
// -------------------------------------------------------

export async function updateBeliefStrength(
  userId: string,
  statement: string,
  outcome: "success" | "failure",
  contextKey = "*",
  client: Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$use" | "$extends"> = prisma
): Promise<boolean> {
  const normalizedContextKey = normalizeContextKey(contextKey);
  const MAX_CAS_RETRIES = 3;

  const delta =
    outcome === "success"
      ? ALPHA * BETA_CONFIRMATION
      : -(ALPHA * BETA_VIOLATION);

  // Transaction logic wrapper: handles both root prisma client and interactive transaction (tx)
  const executeInTransaction = async (
    dbClient: typeof client
  ): Promise<boolean> => {
    // Ensure belief exists first
    const belief = await dbClient.belief.upsert({
      where: {
        userId_statement_contextKey: { userId, statement, contextKey: normalizedContextKey },
      },
      create: {
        userId,
        statement,
        contextKey: normalizedContextKey,
        strength: 0.5,
        autonomyMode: "PROPOSAL",
      },
      update: {},
    });

    const newStrength = Math.max(0, Math.min(1, belief.strength + delta));

    // Single CAS-style update within transaction
    const updated = await dbClient.belief.updateMany({
      where: {
        id: belief.id,
        strength: belief.strength, // CAS guard
      },
      data: {
        strength: newStrength,
        autonomyMode: strengthToAutonomyMode(newStrength),
        ...(outcome === "success"
          ? {
              validatedCycles: { increment: 1 },
              lastValidatedAt: new Date(),
            }
          : {}),
      },
    });

    return updated.count > 0;
  };

  // Detect if client is already an interactive transaction (tx) or root prisma client
  // Interactive tx clients lack $transaction method, so we check for it
  const isRootClient = "$transaction" in client && typeof client.$transaction === "function";

  if (!isRootClient) {
    // Already in a transaction context: CAS retries are pointless because the
    // snapshot is frozen — rereading gets the same stale data. Execute once.
    return executeInTransaction(client);
  }

  // Root prisma client: retry with fresh transactions on CAS failure
  for (let attempt = 0; attempt <= MAX_CAS_RETRIES; attempt++) {
    try {
      const success = await client.$transaction(async (tx) => {
        return executeInTransaction(tx as typeof client);
      });

      if (success) return true;
      // CAS failed, retry with fresh transaction
    } catch (error) {
      // Transaction error (not CAS failure), propagate
      throw error;
    }
  }

  // All retries exhausted
  const safeUserId = userId.length > 12
    ? `${userId.slice(0, 4)}…${userId.slice(-4)}`
    : "***";
  console.warn(
    `updateBeliefStrength: CAS update failed after ${MAX_CAS_RETRIES + 1} attempts (${MAX_CAS_RETRIES} retries) for belief "${statement}" [userId=${safeUserId}]`
  );
  return false;
}

// -------------------------------------------------------
// Increment Validated Cycles (after successful tool use)
// -------------------------------------------------------

export async function incrementValidatedCycles(
  userId: string,
  toolNames: string[]
): Promise<void> {
  const beliefStatements = new Set<string>();
  for (const toolName of toolNames) {
    const statement = TOOL_BELIEF_MAP[toolName];
    if (statement) beliefStatements.add(statement);
  }

  for (const statement of beliefStatements) {
    // Upsert ensures the belief exists, then increment
    await prisma.belief.upsert({
      where: {
        userId_statement_contextKey: {
          userId,
          statement,
          contextKey: "*",
        },
      },
      create: {
        userId,
        statement,
        contextKey: "*",
        strength: 0.5,
        autonomyMode: "PROPOSAL",
        validatedCycles: 1,
        lastValidatedAt: new Date(),
      },
      update: {
        validatedCycles: { increment: 1 },
        lastValidatedAt: new Date(),
      },
    });
  }
}

// -------------------------------------------------------
// Hierarchical Backoff Resolution
// -------------------------------------------------------

export function buildContextKey(
  context: Record<string, string>
): string {
  // Ordered dimensions: category | region | time | price | channel
  const dimensions = ["category", "region", "time", "price", "channel"];
  return dimensions
    .map((d) => {
      const val = context[d];
      if (!val) return "*";
      // Encode to prevent delimiter collision (| and *)
      return encodeURIComponent(val);
    })
    .join("|");
}

/**
 * Canonical global context key — the bare "*" used by CRUD defaults.
 * buildBackoffLadder includes both the pipe-delimited all-wildcard form
 * and the bare "*" so queries match beliefs stored under either format.
 */
const GLOBAL_CONTEXT_KEY = "*";

function buildBackoffLadder(contextKey: string): string[] {
  // Normalize: treat bare "*" the same as the full wildcard pattern
  const fullWildcard = "*|*|*|*|*";
  const normalized = contextKey === GLOBAL_CONTEXT_KEY ? fullWildcard : contextKey;

  const dimensions = normalized.split("|");
  const ladder: string[] = [normalized];

  for (let i = dimensions.length - 1; i > 0; i--) {
    const generalized = [
      ...dimensions.slice(0, i),
      ...Array(dimensions.length - i).fill("*"),
    ];
    ladder.push(generalized.join("|"));
  }

  // Include both the pipe-delimited all-wildcard form and the bare "*" global key
  // so queries match beliefs stored under either format (CRUD uses "*", backoff uses "*|*|*|*|*")
  ladder.push(fullWildcard);
  ladder.push(GLOBAL_CONTEXT_KEY);
  return [...new Set(ladder)]; // Deduplicate
}

export async function resolveBeliefWithBackoff(
  userId: string,
  statement: string,
  context: Record<string, string>
): Promise<{ strength: number; autonomyMode: string; contextKey: string } | null> {
  const contextKey = buildContextKey(context);
  const ladder = buildBackoffLadder(contextKey);

  // Query all potentially matching beliefs at once
  const beliefs = await prisma.belief.findMany({
    where: {
      userId,
      statement,
      contextKey: { in: ladder },
    },
  });

  if (beliefs.length === 0) return null;

  // Return most specific match (first in ladder order)
  const beliefMap = new Map(beliefs.map((b) => [b.contextKey, b]));
  for (const key of ladder) {
    const match = beliefMap.get(key);
    if (match) {
      return {
        strength: match.strength,
        autonomyMode: match.autonomyMode,
        contextKey: match.contextKey,
      };
    }
  }

  return null;
}
