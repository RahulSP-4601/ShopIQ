import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { generateResponse } from "@/lib/gemini/client";
import { QA_SYSTEM_PROMPT } from "@/lib/gemini/prompts";
import { getStoreContext } from "@/lib/metrics/calculator";

interface AttachmentInput {
  type: string;
  name: string;
  size: number;
  mimeType: string;
  url: string;
  path: string;
}

export async function POST(request: NextRequest) {
  try {
    const store = await getStore();

    if (!store) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { message, conversationId, attachments } = await request.json();

    if (!message || typeof message !== "string") {
      // Allow empty message if there are attachments
      if (!attachments || attachments.length === 0) {
        return NextResponse.json(
          { error: "Message or attachments required" },
          { status: 400 }
        );
      }
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
            include: { attachments: true },
          },
        },
      });
      // Reverse to get chronological order (oldest first)
      if (conversation) {
        conversation.messages.reverse();
      }
    }

    if (!conversation) {
      const title = message
        ? message.slice(0, 50) + (message.length > 50 ? "..." : "")
        : "New conversation";
      conversation = await prisma.conversation.create({
        data: {
          storeId: store.id,
          title,
        },
        include: { messages: { include: { attachments: true } } },
      });
    }

    // Save user message with attachments
    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        content: message || "",
        attachments:
          attachments && attachments.length > 0
            ? {
                create: attachments.map((att: AttachmentInput) => ({
                  type: att.type,
                  name: att.name,
                  size: att.size,
                  mimeType: att.mimeType,
                  url: att.url,
                  path: att.path,
                })),
              }
            : undefined,
      },
      include: { attachments: true },
    });

    // Get store context (metrics data)
    const storeContext = await getStoreContext(store.id);

    // Build conversation history for context (including attachments)
    interface MessageWithAttachments {
      role: string;
      content: string;
      attachments: Array<{
        type: string;
        name: string;
        mimeType: string;
        url: string;
      }>;
    }

    const conversationHistory = conversation.messages
      .map((m: MessageWithAttachments) => {
        const role = m.role === "USER" ? "User" : "Assistant";
        let messageContent = m.content;

        // Include attachment info in the history
        if (m.attachments && m.attachments.length > 0) {
          const attachmentInfo = m.attachments
            .map((att) => {
              if (att.type === "audio") {
                return `[Voice recording: ${att.name}]`;
              }
              return `[Attached file: ${att.name} (${att.mimeType})]`;
            })
            .join(", ");

          if (messageContent) {
            messageContent = `${messageContent} ${attachmentInfo}`;
          } else {
            messageContent = attachmentInfo;
          }
        }

        return `${role}: ${messageContent}`;
      })
      .join("\n\n");

    // Build message content for AI including attachment info
    let messageForAI = message || "";
    if (attachments && attachments.length > 0) {
      const attachmentInfo = attachments
        .map((att: AttachmentInput) => {
          if (att.type === "audio") {
            return `[User sent a voice recording: ${att.name}]`;
          }
          return `[User attached a file: ${att.name} (${att.mimeType})]`;
        })
        .join("\n");

      if (messageForAI) {
        messageForAI = `${messageForAI}\n\n${attachmentInfo}`;
      } else {
        messageForAI = attachmentInfo;
      }
    }

    const fullContext = `${storeContext}\n\n=== CONVERSATION HISTORY ===\n${conversationHistory}`;

    // Generate AI response
    const aiResponse = await generateResponse(
      QA_SYSTEM_PROMPT,
      messageForAI,
      fullContext
    );

    // Save assistant message
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: aiResponse,
      },
      include: { attachments: true },
    });

    // Update conversation title if it's the first exchange
    if (conversation.messages.length === 0 && !conversation.title) {
      const title = message
        ? message.slice(0, 50) + (message.length > 50 ? "..." : "")
        : "New conversation";
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { title },
      });
    }

    return NextResponse.json({
      conversationId: conversation.id,
      userMessage: {
        id: userMessage.id,
        role: "USER",
        content: userMessage.content,
        createdAt: userMessage.createdAt,
        attachments: userMessage.attachments.map((att) => ({
          id: att.id,
          type: att.type,
          name: att.name,
          size: att.size,
          mimeType: att.mimeType,
          url: att.url,
        })),
      },
      message: {
        id: assistantMessage.id,
        role: "ASSISTANT",
        content: aiResponse,
        createdAt: assistantMessage.createdAt,
        attachments: [],
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
