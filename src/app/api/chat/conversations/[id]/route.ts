import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth/session";
import { checkSubscription } from "@/lib/auth/subscription";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: session.userId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            attachments: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Transform messages to include formatted attachments
    const transformedConversation = {
      ...conversation,
      messages: conversation.messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
        attachments: msg.attachments.map((att) => ({
          id: att.id,
          type: att.type,
          name: att.name,
          size: att.size,
          mimeType: att.mimeType,
          url: att.url,
        })),
      })),
    };

    return NextResponse.json(transformedConversation);
  } catch {
    return NextResponse.json(
      { error: "Failed to get conversation" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Verify conversation belongs to this user
    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: session.userId },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    await prisma.conversation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}
