import prisma from "@/lib/prisma";
import crypto from "crypto";

// Short, stable hash for log-safe user identification (no raw PII)
function anonymizeId(id: string): string {
  return crypto.createHash("sha256").update(id).digest("hex").slice(0, 12);
}

// -------------------------------------------------------
// Types
// -------------------------------------------------------

export interface AiMaturity {
  aiYears: number;
  geometricMeanReliability: number;
  stage: "Infant" | "Apprentice" | "Professional" | "Expert";
  stageDescription: string;
  totalBeliefs: number;
  highConfidenceCount: number;
  lowConfidenceCount: number;
  totalValidatedCycles: number;
}

// -------------------------------------------------------
// Maturity Calculation (from AI Years framework)
// -------------------------------------------------------

const VALIDATED_CYCLES_PER_AI_YEAR = 18000;

function mapToStage(geometricMean: number): {
  stage: AiMaturity["stage"];
  description: string;
} {
  if (geometricMean >= 0.99) {
    return {
      stage: "Expert",
      description: "Full domain autonomy, resilient to drift",
    };
  }
  if (geometricMean >= 0.95) {
    return {
      stage: "Professional",
      description: "Autonomous for most tasks, rare escalation",
    };
  }
  if (geometricMean >= 0.90) {
    return {
      stage: "Apprentice",
      description: "Handles routine tasks, needs supervision for edge cases",
    };
  }
  return {
    stage: "Infant",
    description: "Still learning basics, asks often",
  };
}

export async function calculateAiMaturity(
  userId: string
): Promise<AiMaturity> {
  if (!userId?.trim()) {
    throw new Error("calculateAiMaturity: userId is required");
  }

  const beliefs = await prisma.belief.findMany({
    where: { userId },
    select: {
      strength: true,
      validatedCycles: true,
    },
  });

  if (beliefs.length === 0) {
    return {
      aiYears: 0,
      geometricMeanReliability: 0,
      stage: "Infant",
      stageDescription: "Still learning basics, asks often",
      totalBeliefs: 0,
      highConfidenceCount: 0,
      lowConfidenceCount: 0,
      totalValidatedCycles: 0,
    };
  }

  // Geometric mean of belief strengths
  // Use log-sum to avoid floating point underflow with many beliefs
  const logSum = beliefs.reduce((sum, b) => {
    // Defensively handle NaN/Infinity by checking isFinite first
    const s = Number.isFinite(b.strength) && b.strength > 0 ? b.strength : 0.001;
    return sum + Math.log(s);
  }, 0);
  let geometricMean = Math.exp(logSum / beliefs.length);

  // Validate and clamp the result to prevent NaN/Infinity
  if (!Number.isFinite(geometricMean) || geometricMean < 0.001 || geometricMean > 1.0) {
    const original = geometricMean;
    geometricMean = Math.max(0.001, Math.min(1.0, Number.isFinite(geometricMean) ? geometricMean : 0.001));
    console.warn(
      `AI maturity geometric mean clamped from ${original} to ${geometricMean} for user=${anonymizeId(userId)} ` +
      `(beliefs.length=${beliefs.length}, logSum=${logSum})`
    );
  }

  const totalValidatedCycles = beliefs.reduce(
    (sum, b) => sum + (b.validatedCycles ?? 0),
    0
  );
  const aiYears = totalValidatedCycles / VALIDATED_CYCLES_PER_AI_YEAR;

  const { stage, description } = mapToStage(geometricMean);

  return {
    aiYears: Math.round(aiYears * 100) / 100,
    geometricMeanReliability: Math.round(geometricMean * 1000) / 1000,
    stage,
    stageDescription: description,
    totalBeliefs: beliefs.length,
    highConfidenceCount: beliefs.filter((b) => Number.isFinite(b.strength) && b.strength > 0.7).length,
    lowConfidenceCount: beliefs.filter((b) => Number.isFinite(b.strength) && b.strength < 0.4).length,
    totalValidatedCycles,
  };
}

// -------------------------------------------------------
// Snapshot (for tracking progression over time)
// -------------------------------------------------------

export async function snapshotMaturity(userId: string): Promise<void> {
  const maturity = await calculateAiMaturity(userId);

  await prisma.aiMaturitySnapshot.create({
    data: {
      userId,
      geometricMeanReliability: maturity.geometricMeanReliability,
      stage: maturity.stage,
      aiYears: maturity.aiYears,
      totalBeliefs: maturity.totalBeliefs,
      highConfidenceCount: maturity.highConfidenceCount,
      lowConfidenceCount: maturity.lowConfidenceCount,
      totalValidatedCycles: maturity.totalValidatedCycles,
    },
  });
}

export async function getMaturityHistory(userId: string, limit = 12) {
  if (!userId?.trim()) {
    throw new Error("getMaturityHistory: userId is required");
  }

  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit) || 12));
  return prisma.aiMaturitySnapshot.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: safeLimit,
  });
}

// -------------------------------------------------------
// Cleanup (called by cleanup cron)
// -------------------------------------------------------

const MIN_RETENTION_DAYS = 30;

export async function cleanupOldSnapshots(
  olderThanDays = 365
): Promise<number> {
  // Validate to prevent accidental mass deletion
  if (!Number.isFinite(olderThanDays) || olderThanDays < MIN_RETENTION_DAYS) {
    throw new Error(
      `cleanupOldSnapshots: invalid olderThanDays=${olderThanDays}, must be >= ${MIN_RETENTION_DAYS}`
    );
  }

  const safeDays = Math.floor(olderThanDays);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - safeDays);

  const result = await prisma.aiMaturitySnapshot.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return result.count;
}
