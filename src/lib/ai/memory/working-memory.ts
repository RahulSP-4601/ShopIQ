import { getBeliefs } from "./beliefs";
import { getContextualNotes, extractContextEntities } from "./notes";
import { calculateAiMaturity, type AiMaturity } from "./maturity";
import prisma from "@/lib/prisma";
import { UnifiedOrderStatus } from "@prisma/client";

// -------------------------------------------------------
// Constants
// -------------------------------------------------------

const MAX_BELIEFS = 5;
const MAX_NOTES = 5;
const MAX_ALERTS = 3;
const MAX_PEOPLE = 3;

// -------------------------------------------------------
// Build Complete Working Memory Prompt
// -------------------------------------------------------

export interface WorkingMemoryResult {
  prompt: string;
  surfacedAlertIds: string[];
}

export async function buildWorkingMemoryPrompt(
  userId: string,
  userMessage?: string,
  timeZone?: string
): Promise<WorkingMemoryResult> {
  try {
    // Extract context entities from user message for contextual note surfacing
    const contextEntities = userMessage
      ? extractContextEntities(userMessage)
      : [];

    // Use Promise.allSettled for error isolation — one failing query won't kill the whole memory
    const settled = await Promise.allSettled([
      getBeliefs(userId, 0.3), // Only beliefs with some signal
      getContextualNotes(userId, contextEntities, MAX_NOTES),
      getPendingAlerts(userId, MAX_ALERTS),
      calculateAiMaturity(userId),
      prisma.businessProfile.findUnique({ where: { userId } }),
      getTopPeople(userId, MAX_PEOPLE),
      getChannelInventorySummary(userId),
    ]);

    // Extract results with safe defaults for any failures
    const beliefs = settled[0].status === "fulfilled" ? settled[0].value : [];
    const notes = settled[1].status === "fulfilled" ? settled[1].value : [];
    const alerts = settled[2].status === "fulfilled" ? settled[2].value : [];
    const maturity: AiMaturity = settled[3].status === "fulfilled"
      ? settled[3].value
      : { stage: "Infant", aiYears: 0, geometricMeanReliability: 0, stageDescription: "Maturity data unavailable", totalBeliefs: 0, highConfidenceCount: 0, lowConfidenceCount: 0, totalValidatedCycles: 0 };
    const businessProfile = settled[4].status === "fulfilled" ? settled[4].value : null;
    const topPeopleResult = settled[5].status === "fulfilled" ? settled[5].value : { people: [], dominantCurrency: null };
    const topPeople = topPeopleResult.people;
    const dominantCurrency = topPeopleResult.dominantCurrency;
    const channelInventory = settled[6].status === "fulfilled" ? settled[6].value : [];

    // Collect surfaced alert IDs so callers can scope markAlertsSurfaced
    const surfacedAlertIds = alerts.map((a: { id: string }) => a.id);

    // Log any failures for debugging (but don't crash)
    for (let i = 0; i < settled.length; i++) {
      if (settled[i].status === "rejected") {
        const labels = ["beliefs", "notes", "alerts", "maturity", "profile", "people", "inventory"];
        console.error(`Working memory ${labels[i]} failed:`, (settled[i] as PromiseRejectedResult).reason);
      }
    }

    const sections: string[] = [];

    // Column 1: Active Alerts
    sections.push(formatAlertsColumn(alerts));

    // Column 2: Notes
    sections.push(formatNotesColumn(notes));

    // Column 3: Context (People + Beliefs + Maturity + Temporal + Business Profile + Inventory)
    const truncatedBeliefs = beliefs.slice(0, MAX_BELIEFS);
    sections.push(formatContextColumn(truncatedBeliefs, maturity, businessProfile, topPeople, channelInventory, dominantCurrency));

    // Temporal context
    sections.push(formatTemporalContext(timeZone));

    // Dynamic autonomy instructions based on beliefs (same truncated set as context column)
    sections.push(formatAutonomyInstructions(truncatedBeliefs));

    return {
      prompt: sections.filter(Boolean).join("\n\n"),
      surfacedAlertIds,
    };
  } catch (error) {
    console.error("Failed to build working memory:", error);
    // Graceful degradation — return minimal block so chat still works
    return {
      prompt: `# WORKING MEMORY STATE
Memory system temporarily unavailable. Proceeding with standard analysis capabilities.`,
      surfacedAlertIds: [],
    };
  }
}

// -------------------------------------------------------
// Alert Helpers
// -------------------------------------------------------

const SEVERITY_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

async function getPendingAlerts(userId: string, limit: number) {
  const alerts = await prisma.alert.findMany({
    where: {
      userId,
      status: "pending",
    },
    orderBy: { createdAt: "desc" },
    take: limit * 2,
  });

  return alerts
    .sort((a, b) => {
      const rankDiff = (SEVERITY_RANK[(b.severity || "medium").toLowerCase()] || 0) - (SEVERITY_RANK[(a.severity || "medium").toLowerCase()] || 0);
      if (rankDiff !== 0) return rankDiff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .slice(0, limit);
}

function formatAlertsColumn(
  alerts: Array<{
    id: string;
    type: string;
    severity: string;
    title: string;
    body: string;
  }>
): string {
  if (alerts.length === 0) {
    return `# WORKING MEMORY STATE

## Active Alerts (Column 1)
No active alerts.`;
  }

  const severityIcon: Record<string, string> = {
    critical: "CRITICAL",
    high: "HIGH",
    medium: "MEDIUM",
    low: "LOW",
  };

  const lines = alerts.map((a) => {
    const sevKey = (a.severity || "medium").toLowerCase();
    return `- [${severityIcon[sevKey] || "INFO"}] ${a.title}: ${a.body}`;
  });

  return `# WORKING MEMORY STATE

## Active Alerts (Column 1)
${lines.join("\n")}`;
}

// -------------------------------------------------------
// Notes Helpers
// -------------------------------------------------------

function formatNotesColumn(
  notes: Array<{
    content: string;
    effectivePriority: number;
    escalationLevel: string;
    hoursRemaining: number;
    source: string;
  }>
): string {
  if (notes.length === 0) {
    return `## My Notes (Column 2)
No active notes.`;
  }

  const lines = notes.map((n) => {
    const timeLabel =
      n.hoursRemaining <= 0
        ? "expired"
        : n.hoursRemaining >= 24
          ? `${Math.round(n.hoursRemaining / 24)}d remaining`
          : `${Math.round(n.hoursRemaining)}h remaining`;

    const escalation =
      n.escalationLevel === "CRITICAL"
        ? " ⚠ URGENT"
        : n.escalationLevel === "WARNING"
          ? " (expiring soon)"
          : "";

    return `- [Priority ${n.effectivePriority.toFixed(1)}, ${timeLabel}${escalation}] "${n.content}"`;
  });

  return `## My Notes (Column 2)
${lines.join("\n")}`;
}

// -------------------------------------------------------
// People Objects (Top Repeat Customers)
// -------------------------------------------------------

interface PersonObject {
  displayName: string;
  maskedEmail: string;
  totalSpent: number;
  orderCount: number;
  relationship: number; // 0-1 based on order frequency
}

function maskEmail(email: string): string {
  const atIndex = email.lastIndexOf("@");
  if (atIndex < 1) return "***@***"; // No '@' or empty local part
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  if (!domain) return "***@***";
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}

function pseudonymizeName(name: string): string {
  if (!name || name === "Unknown") return "Customer";
  const parts = name.trim().split(/\s+/);
  return parts.map((p) => (p[0] || "").toUpperCase()).join("") || "Customer";
}

interface TopPeopleResult {
  people: PersonObject[];
  dominantCurrency: string | null;
}

async function getTopPeople(userId: string, limit: number): Promise<TopPeopleResult> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const orders = await prisma.unifiedOrder.findMany({
    where: {
      userId,
      customerEmail: { not: null },
      status: { not: UnifiedOrderStatus.CANCELLED },
      orderedAt: { gte: ninetyDaysAgo },
    },
    select: {
      customerEmail: true,
      customerName: true,
      totalAmount: true,
      currency: true,
    },
    take: 5000, // Cap to prevent unbounded memory usage at scale
  });

  if (orders.length === 0) return { people: [], dominantCurrency: null };

  // Determine the most common currency across orders
  const currencyCounts = new Map<string, number>();
  for (const order of orders) {
    if (order.currency) {
      currencyCounts.set(order.currency, (currencyCounts.get(order.currency) || 0) + 1);
    }
  }
  let dominantCurrency: string | null = null;
  let maxCount = 0;
  for (const [code, count] of currencyCounts) {
    if (count > maxCount) {
      dominantCurrency = code;
      maxCount = count;
    }
  }

  const customerMap = new Map<
    string,
    { name: string; totalSpent: number; orderCount: number }
  >();

  for (const order of orders) {
    if (!order.customerEmail) continue;
    // Only aggregate orders that match the dominant currency to avoid mixing currencies
    if (order.currency !== dominantCurrency) continue;

    const existing = customerMap.get(order.customerEmail) || {
      name: order.customerName || "Unknown",
      totalSpent: 0,
      orderCount: 0,
    };
    existing.totalSpent += Number(order.totalAmount || 0);
    existing.orderCount += 1;
    if (order.customerName && existing.name === "Unknown") {
      existing.name = order.customerName;
    }
    customerMap.set(order.customerEmail, existing);
  }

  // Only include repeat customers (2+ orders)
  const repeatCustomers = Array.from(customerMap.entries())
    .filter(([, data]) => data.orderCount >= 2)
    .sort((a, b) => b[1].totalSpent - a[1].totalSpent)
    .slice(0, limit);

  // Max orders among results for relationship normalization
  const maxOrders = repeatCustomers.reduce(
    (max, [, data]) => Math.max(max, data.orderCount),
    1
  );

  const people = repeatCustomers.map(([email, data]) => ({
    displayName: pseudonymizeName(data.name),
    maskedEmail: maskEmail(email),
    totalSpent: data.totalSpent,
    orderCount: data.orderCount,
    // Relationship strength: 0.5 base + up to 0.5 based on relative order frequency
    relationship: Math.min(1.0, 0.5 + (data.orderCount / maxOrders) * 0.5),
  }));

  return { people, dominantCurrency };
}

// -------------------------------------------------------
// Cross-Channel Inventory Summary
// -------------------------------------------------------

interface ChannelInventory {
  marketplace: string;
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
}

async function getChannelInventorySummary(userId: string): Promise<ChannelInventory[]> {
  const connections = await prisma.marketplaceConnection.findMany({
    where: { userId, status: "CONNECTED" },
    select: { id: true, marketplace: true },
  });

  if (connections.length <= 1) return []; // Only useful for multi-channel

  // Parallel all connections instead of sequential N+3 loop
  // Use allSettled so one failing connection doesn't drop all inventory data
  const settled = await Promise.allSettled(
    connections.map(async (conn) => {
      const [totalProducts, lowStock, outOfStock] = await Promise.all([
        prisma.unifiedProduct.count({
          where: { connectionId: conn.id, status: "ACTIVE" },
        }),
        prisma.unifiedProduct.count({
          where: {
            connectionId: conn.id,
            status: "ACTIVE",
            inventory: { gt: 0, lte: 10 },
          },
        }),
        prisma.unifiedProduct.count({
          where: {
            connectionId: conn.id,
            status: "ACTIVE",
            inventory: { lte: 0 },
          },
        }),
      ]);
      return { marketplace: conn.marketplace, totalProducts, lowStockCount: lowStock, outOfStockCount: outOfStock };
    })
  );

  const connectionResults: ChannelInventory[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled") {
      if (result.value.totalProducts > 0) {
        connectionResults.push(result.value);
      }
    } else {
      console.warn(
        `Channel inventory query failed for a connection: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`
      );
    }
  }

  return connectionResults;
}

// -------------------------------------------------------
// Context Column (People + Beliefs + Maturity + Inventory)
// -------------------------------------------------------

function formatAmount(amount: number, currency: string | null): string {
  if (currency) {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
    } catch {
      // Invalid currency code — fall back to plain number
    }
  }
  return amount.toFixed(2);
}

function formatContextColumn(
  beliefs: Array<{
    statement: string;
    strength: number;
    autonomyMode: string;
    contextKey: string;
  }>,
  maturity: AiMaturity,
  profile: { industry: string; businessSize: string; primaryCategory: string | null; targetMarket: string | null } | null,
  people: PersonObject[],
  channelInventory: ChannelInventory[],
  dominantCurrency: string | null = null
): string {
  const profileLines: string[] = [];
  if (profile) {
    profileLines.push(`Business Profile: ${profile.industry.replace(/_/g, " ")} / ${profile.businessSize}`);
    if (profile.primaryCategory) {
      profileLines.push(`Primary Category: ${profile.primaryCategory}`);
    }
    if (profile.targetMarket) {
      profileLines.push(`Target Market: ${profile.targetMarket}`);
    }
  }

  // People section
  const peopleLines: string[] = [];
  if (people.length > 0) {
    peopleLines.push("People:");
    for (const p of people) {
      peopleLines.push(
        `- ${p.displayName} [${p.maskedEmail}] (${p.orderCount} orders, ${formatAmount(p.totalSpent, dominantCurrency)} spent, relationship: ${p.relationship.toFixed(2)})`
      );
    }
  }

  // Beliefs section
  const beliefLines =
    beliefs.length > 0
      ? beliefs.map((b) => {
          const pct = Math.round(b.strength * 100);
          const ctx =
            b.contextKey !== "*" ? ` [context: ${b.contextKey}]` : "";
          return `- "${b.statement}" (confidence: ${pct}%, mode: ${b.autonomyMode})${ctx}`;
        })
      : ["- No established beliefs yet. I'm in learning mode."];

  // Cross-channel inventory section
  const inventoryLines: string[] = [];
  if (channelInventory.length > 0) {
    inventoryLines.push("Cross-Channel Inventory:");
    for (const ch of channelInventory) {
      const issues: string[] = [];
      if (ch.outOfStockCount > 0) issues.push(`${ch.outOfStockCount} out-of-stock`);
      if (ch.lowStockCount > 0) issues.push(`${ch.lowStockCount} low-stock`);
      const issueStr = issues.length > 0 ? ` — ${issues.join(", ")}` : " — healthy";
      inventoryLines.push(
        `- ${ch.marketplace}: ${ch.totalProducts} products${issueStr}`
      );
    }
  }

  const sections = [
    `## What I Know About This Business (Column 3)`,
    profileLines.length > 0 ? profileLines.join("\n") : "",
    peopleLines.length > 0 ? peopleLines.join("\n") : "",
    `Beliefs:\n${beliefLines.join("\n")}`,
    inventoryLines.length > 0 ? inventoryLines.join("\n") : "",
    `AI Maturity: ${maturity.stage} (${maturity.aiYears} AI Years, reliability ${maturity.geometricMeanReliability})\n${maturity.stageDescription}`,
  ];

  return sections.filter(Boolean).join("\n\n");
}

// -------------------------------------------------------
// Temporal Context
// -------------------------------------------------------

function formatTemporalContext(timeZone?: string): string {
  const now = new Date();
  let tz = timeZone || "UTC";

  // Validate the timezone — fall back to UTC if invalid to prevent RangeError
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).formatToParts(now);
  } catch {
    tz = "UTC";
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).formatToParts(now);
  }

  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  const dayName = get("weekday");
  const monthName = get("month");
  const rawDay = get("day");
  const dayOfMonth = rawDay ? Number(rawDay) : NaN;
  const dayDisplay = Number.isFinite(dayOfMonth) ? String(dayOfMonth) : "??";
  const year = get("year");

  // Compute total days in month using zoned year/month
  const monthIndex = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ].indexOf(monthName);
  const zonedYear = Number(year);
  const totalDays = monthIndex >= 0
    ? new Date(zonedYear, monthIndex + 1, 0).getDate()
    : 31;

  let monthPosition: string;
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
    monthPosition = "Mid-month"; // Safe fallback for unparseable day
  } else if (dayOfMonth <= 5) monthPosition = "Start of month";
  else if (dayOfMonth <= 15) monthPosition = "Mid-month";
  else if (dayOfMonth <= totalDays - 5) monthPosition = "Late month";
  else monthPosition = "Month-end (urgency: 1.5x)";

  const isWeekend = dayName === "Saturday" || dayName === "Sunday";

  return `## Temporal Context
- Today: ${dayName}, ${monthName} ${dayDisplay}, ${year}
- Month position: ${monthPosition}
- ${isWeekend ? "Weekend — expect higher sales for some categories" : "Weekday — standard business hours"}`;
}

// -------------------------------------------------------
// Dynamic Autonomy Instructions
// -------------------------------------------------------

function formatAutonomyInstructions(
  beliefs: Array<{ statement: string; autonomyMode: string }>
): string {
  const autonomous = beliefs.filter(
    (b) => b.autonomyMode === "AUTONOMOUS"
  );
  const proposal = beliefs.filter((b) => b.autonomyMode === "PROPOSAL");
  const guidance = beliefs.filter(
    (b) => b.autonomyMode === "GUIDANCE_SEEKING"
  );

  const lines: string[] = ["## Autonomy Calibration"];

  if (autonomous.length > 0) {
    lines.push(
      `Tasks I'm confident about (execute directly): ${autonomous.map((b) => b.statement).join(", ")}`
    );
  }

  if (proposal.length > 0) {
    lines.push(
      `Tasks I should present as observations: ${proposal.map((b) => b.statement).join(", ")}`
    );
  }

  if (guidance.length > 0) {
    lines.push(
      `Tasks where I should ask clarifying questions: ${guidance.map((b) => b.statement).join(", ")}`
    );
  }

  if (beliefs.length === 0) {
    lines.push(
      "No task-specific calibration yet. Default to presenting findings as observations and asking questions when uncertain."
    );
  }

  return lines.join("\n");
}

// -------------------------------------------------------
// Mark Alerts as Surfaced
// -------------------------------------------------------

export async function markAlertsSurfaced(
  userId: string,
  alertIds: string[]
): Promise<number> {
  if (alertIds.length === 0) return 0;

  const result = await prisma.alert.updateMany({
    where: {
      userId,
      status: "pending",
      id: { in: alertIds },
    },
    data: {
      status: "surfaced",
      surfacedAt: new Date(),
    },
  });
  return result.count;
}
