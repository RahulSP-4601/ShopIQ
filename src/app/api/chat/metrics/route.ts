import { NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth/session";
import { checkSubscription } from "@/lib/auth/subscription";
import { getFrameMetrics } from "@/lib/ai/memory/metrics";

/**
 * GET /api/chat/metrics
 *
 * Returns AI maturity metrics, competence progression,
 * belief quality, and business impact for the authenticated user.
 * Follows Section 8 (Key Metrics to Track) from AI.md.
 */
export async function GET() {
  try {
    const session = await getUserSession();

    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { hasActiveSubscription } = await checkSubscription();
    if (!hasActiveSubscription) {
      return NextResponse.json(
        { error: "Active subscription required" },
        { status: 403 }
      );
    }

    if (typeof session.userId !== "string" || !session.userId.trim()) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    const metrics = await getFrameMetrics(session.userId);

    return NextResponse.json(metrics);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`Metrics error: ${msg}`);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
