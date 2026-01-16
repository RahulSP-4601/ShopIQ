import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { generateResponse } from "@/lib/gemini/client";
import { QA_SYSTEM_PROMPT } from "@/lib/gemini/prompts";
import { getStoreContext } from "@/lib/metrics/calculator";

export async function POST(request: NextRequest) {
  try {
    const store = await getStore();

    if (!store) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { message, conversationId } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, storeId: store.id },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 20, // Last 20 messages for context
          },
        },
      });
      // Reverse to get chronological order (oldest first)
      if (conversation) {
        conversation.messages.reverse();
      }
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          storeId: store.id,
          title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
        },
        include: { messages: true },
      });
    }

    // Save user message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        content: message,
      },
    });

    // Get store context (metrics data)
    const storeContext = await getStoreContext(store.id);

    // Build conversation history for context
    const conversationHistory = conversation.messages
      .map((m: { role: string; content: string }) => `${m.role === "USER" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n\n");

    const fullContext = `${storeContext}\n\n=== CONVERSATION HISTORY ===\n${conversationHistory}`;

    // Generate AI response
    const aiResponse = await generateResponse(
      QA_SYSTEM_PROMPT,
      message,
      fullContext
    );

    // Save assistant message
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: aiResponse,
      },
    });

    // Update conversation title if it's the first exchange
    if (conversation.messages.length === 0 && !conversation.title) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
        },
      });
    }

    return NextResponse.json({
      conversationId: conversation.id,
      message: {
        id: assistantMessage.id,
        role: "ASSISTANT",
        content: aiResponse,
        createdAt: assistantMessage.createdAt,
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
