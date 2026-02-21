import { NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth/session";
import { checkSubscription } from "@/lib/auth/subscription";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getUserSession();

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check for active subscription
    const { hasActiveSubscription } = await checkSubscription();

    if (!hasActiveSubscription) {
      return NextResponse.json(
        { error: "Active subscription required", code: "SUBSCRIPTION_REQUIRED" },
        { status: 403 }
      );
    }

    // Get conversations directly by userId
    const conversations = await prisma.conversation.findMany({
      where: { userId: session.userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { messages: true },
        },
      },
    });

    return NextResponse.json(conversations);
  } catch {
    return NextResponse.json(
      { error: "Failed to get conversations" },
      { status: 500 }
    );
  }
}
