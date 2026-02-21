import prisma from "@/lib/prisma";
import { calculateAiMaturity } from "./maturity";

// Type-safe keys for DB string columns (Alert.type and MessageFeedback.rating
// are plain strings in the schema, not Prisma enums)
const ALERT_TYPES = {
  stockout: "stockout",
  demand_surge: "demand_surge",
  revenue_anomaly: "revenue_anomaly",
  return_pattern: "return_pattern",
} as const;

const FEEDBACK_RATINGS = {
  positive: "positive",
} as const;

// -------------------------------------------------------
// Types (Section 8 of AI.md)
// -------------------------------------------------------

export interface FrameMetrics {
  aiMaturity: {
    ageAiYears: number;
    geometricMeanReliability: number;
    stage: string;
    clarificationRate: number; // Questions asked / Total interactions
  };
  competenceProgression: {
    autonomyPercent: number; // % of beliefs at AUTONOMOUS level
    proposalPercent: number;
    guidanceSeekingPercent: number;
    learningVelocity: number; // % autonomy increase per week
  };
  beliefQuality: {
    totalBeliefs: number;
    highConfidenceCount: number; // strength > 0.7
    lowConfidenceCount: number; // strength < 0.4
    avgStrength: number;
    competencePreservation: number; // % of beliefs stable (not degraded) in last 7 days
  };
  businessImpact: {
    totalAlertsSurfaced: number;
    stockoutAlerts: number;
    demandSurgeAlerts: number;
    revenueAnomalyAlerts: number;
    returnPatternAlerts: number;
    totalFeedback: number;
    positiveFeedbackRate: number; // positive / total
    notesCreated: number;
    notesActedOn: number;
  };
}

// -------------------------------------------------------
// Clarification Rate
// -------------------------------------------------------

/**
 * Calculate clarification rate: how often the AI asks questions.
 * Counts ASSISTANT messages containing "?" as a proxy for questions asked.
 */
async function calculateClarificationRate(userId: string): Promise<number> {
  const conversations = await prisma.conversation.findMany({
    where: { userId },
    select: { id: true },
    orderBy: { updatedAt: "desc" },
    take: 500, // Cap to recent conversations for performance
  });

  if (conversations.length === 0) return 0;

  const conversationIds = conversations.map((c) => c.id);

  const [totalAssistant, questionMessages] = await Promise.all([
    prisma.message.count({
      where: {
        conversationId: { in: conversationIds },
        role: "ASSISTANT",
      },
    }),
    prisma.message.count({
      where: {
        conversationId: { in: conversationIds },
        role: "ASSISTANT",
        content: { contains: "?" },
      },
    }),
  ]);

  if (totalAssistant === 0) return 0;
  return Math.round((questionMessages / totalAssistant) * 1000) / 1000;
}

// -------------------------------------------------------
// Competence Progression
// -------------------------------------------------------

/**
 * Calculate competence progression from current beliefs and historical snapshots.
 */
async function calculateCompetenceProgression(userId: string): Promise<{
  autonomyPercent: number;
  proposalPercent: number;
  guidanceSeekingPercent: number;
  learningVelocity: number;
}> {
  const beliefs = await prisma.belief.findMany({
    where: { userId },
    select: { strength: true },
  });

  const total = beliefs.length || 1;
  // Use strength thresholds for consistency with snapshot's highConfidenceCount
  const autonomous = beliefs.filter((b) => b.strength > 0.7).length;
  const proposal = beliefs.filter((b) => b.strength >= 0.4 && b.strength <= 0.7).length;
  const guidance = beliefs.filter((b) => b.strength < 0.4).length;

  const currentAutonomyPct = Math.round((autonomous / total) * 1000) / 10;

  // Calculate learning velocity from maturity snapshots (weekly change)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const previousSnapshot = await prisma.aiMaturitySnapshot.findFirst({
    where: {
      userId,
      createdAt: { lte: oneWeekAgo },
    },
    orderBy: { createdAt: "desc" },
    select: { highConfidenceCount: true, totalBeliefs: true },
  });

  let learningVelocity = 0;
  if (previousSnapshot && previousSnapshot.totalBeliefs > 0) {
    const prevAutonomyPct =
      (previousSnapshot.highConfidenceCount / previousSnapshot.totalBeliefs) * 100;
    learningVelocity =
      Math.round((currentAutonomyPct - prevAutonomyPct) * 10) / 10;
  }

  return {
    autonomyPercent: currentAutonomyPct,
    proposalPercent: Math.round((proposal / total) * 1000) / 10,
    guidanceSeekingPercent: Math.round((guidance / total) * 1000) / 10,
    learningVelocity,
  };
}

// -------------------------------------------------------
// Belief Quality
// -------------------------------------------------------

/**
 * Calculate belief quality metrics including competence preservation.
 * Competence preservation = % of recently-touched beliefs (updated in the last
 * 7 days) that are maintaining competence level (strength >= 0.4). This is a
 * proxy metric: without historical strength snapshots per-belief, we measure
 * "what fraction of active beliefs remain above the competence threshold"
 * rather than true degradation detection. A future improvement could compare
 * current strength to a stored previousStrength per belief for precise tracking.
 */
async function calculateBeliefQuality(userId: string): Promise<{
  totalBeliefs: number;
  highConfidenceCount: number;
  lowConfidenceCount: number;
  avgStrength: number;
  competencePreservation: number;
}> {
  const beliefs = await prisma.belief.findMany({
    where: { userId },
    select: { strength: true, updatedAt: true },
  });

  if (beliefs.length === 0) {
    return {
      totalBeliefs: 0,
      highConfidenceCount: 0,
      lowConfidenceCount: 0,
      avgStrength: 0,
      competencePreservation: 1.0,
    };
  }

  const highConfidence = beliefs.filter((b) => b.strength > 0.7).length;
  const lowConfidence = beliefs.filter((b) => b.strength < 0.4).length;
  const avgStrength =
    Math.round(
      (beliefs.reduce((s, b) => s + b.strength, 0) / beliefs.length) * 1000
    ) / 1000;

  // Competence preservation: % of recently-touched beliefs maintaining competence level
  // (strength >= 0.4). Only considers beliefs updated in the last 7 days.
  // NOTE: This measures current competence level, not true degradation. Without
  // per-belief historical strength tracking, we cannot detect beliefs that dropped
  // from a higher value. See docstring above for future improvement path.
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentBeliefs = beliefs.filter((b) => b.updatedAt >= sevenDaysAgo);
  const recentPreserved = recentBeliefs.filter((b) => b.strength >= 0.4).length;
  const competencePreservation = recentBeliefs.length > 0
    ? Math.round((recentPreserved / recentBeliefs.length) * 1000) / 1000
    : 1.0; // No recent changes = fully preserved

  return {
    totalBeliefs: beliefs.length,
    highConfidenceCount: highConfidence,
    lowConfidenceCount: lowConfidence,
    avgStrength,
    competencePreservation,
  };
}

// -------------------------------------------------------
// Business Impact
// -------------------------------------------------------

/**
 * Calculate business impact metrics from alerts and feedback.
 */
async function calculateBusinessImpact(userId: string): Promise<{
  totalAlertsSurfaced: number;
  stockoutAlerts: number;
  demandSurgeAlerts: number;
  revenueAnomalyAlerts: number;
  returnPatternAlerts: number;
  totalFeedback: number;
  positiveFeedbackRate: number;
  notesCreated: number;
  notesActedOn: number;
}> {
  const [alertsByType, feedbackCounts, noteStats] = await Promise.all([
    // Alert counts by type
    prisma.alert.groupBy({
      by: ["type"],
      where: { userId },
      _count: { _all: true },
    }),
    // Feedback counts
    prisma.messageFeedback.groupBy({
      by: ["rating"],
      where: { userId },
      _count: { _all: true },
    }),
    // Note stats
    Promise.all([
      prisma.note.count({ where: { userId } }),
      prisma.note.count({ where: { userId, status: "ACTED_ON" } }),
    ]),
  ]);

  const alertCounts: Record<string, number> = {};
  let totalAlerts = 0;
  for (const group of alertsByType) {
    alertCounts[group.type] = group._count._all;
    totalAlerts += group._count._all;
  }

  const feedbackMap: Record<string, number> = {};
  let totalFeedback = 0;
  for (const group of feedbackCounts) {
    feedbackMap[group.rating] = group._count._all;
    totalFeedback += group._count._all;
  }

  const positiveFeedbackRate =
    totalFeedback > 0
      ? Math.round(((feedbackMap[FEEDBACK_RATINGS.positive] || 0) / totalFeedback) * 1000) / 1000
      : 0;

  return {
    totalAlertsSurfaced: totalAlerts,
    stockoutAlerts: alertCounts[ALERT_TYPES.stockout] || 0,
    demandSurgeAlerts: alertCounts[ALERT_TYPES.demand_surge] || 0,
    revenueAnomalyAlerts: alertCounts[ALERT_TYPES.revenue_anomaly] || 0,
    returnPatternAlerts: alertCounts[ALERT_TYPES.return_pattern] || 0,
    totalFeedback,
    positiveFeedbackRate,
    notesCreated: noteStats[0],
    notesActedOn: noteStats[1],
  };
}

// -------------------------------------------------------
// Main: Get All Metrics
// -------------------------------------------------------

export async function getFrameMetrics(
  userId: string
): Promise<FrameMetrics> {
  const [maturity, clarificationRate, progression, beliefQuality, impact] =
    await Promise.all([
      calculateAiMaturity(userId),
      calculateClarificationRate(userId),
      calculateCompetenceProgression(userId),
      calculateBeliefQuality(userId),
      calculateBusinessImpact(userId),
    ]);

  return {
    aiMaturity: {
      ageAiYears: maturity.aiYears,
      geometricMeanReliability: maturity.geometricMeanReliability,
      stage: maturity.stage,
      clarificationRate,
    },
    competenceProgression: progression,
    beliefQuality,
    businessImpact: impact,
  };
}
