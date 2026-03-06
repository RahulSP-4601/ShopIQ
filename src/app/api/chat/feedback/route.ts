import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth/session";
import { checkSubscription } from "@/lib/auth/subscription";
import prisma from "@/lib/prisma";
import { recordFeedback } from "@/lib/ai/feedback";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession();

    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Rate limit by userId
    const { allowed, retryAfterMs } = await checkRateLimit(`feedback:${session.userId}`, {
      maxRequests: 30,
      windowMs: 60_000,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((retryAfterMs || 60_000) / 1000)) },
        }
      );
    }

    const { hasActiveSubscription } = await checkSubscription();
    if (!hasActiveSubscription) {
      return NextResponse.json(
        { error: "Active subscription required" },
        { status: 403 }
      );
    }

    let messageId: unknown;
    let rating: unknown;
    try {
      const body = await request.json();
      messageId = body.messageId;
      rating = body.rating;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (!messageId || typeof messageId !== "string") {
      return NextResponse.json(
        { error: "messageId is required" },
        { status: 400 }
      );
    }

    if (rating !== "positive" && rating !== "negative") {
      return NextResponse.json(
        { error: "rating must be 'positive' or 'negative'" },
        { status: 400 }
      );
    }

    // Normalize to FeedbackRating enum values (POSITIVE/NEGATIVE map to "positive"/"negative" in DB via @map)
    const normalizedRating: "POSITIVE" | "NEGATIVE" =
      rating === "positive" ? "POSITIVE" : "NEGATIVE";

    // Verify the message belongs to the user (through conversation)
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        role: "ASSISTANT",
        conversation: { userId: session.userId },
      },
      select: { id: true },
    });

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    await recordFeedback(session.userId, messageId, normalizedRating);

    return NextResponse.json({ success: true });
  } catch (error) {
    // Sanitize error logging - only log message, not full error object (prevents sensitive data leaks)
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Feedback error:", errorMessage);
    return NextResponse.json(
      { error: "Failed to record feedback" },
      { status: 500 }
    );
  }
}
