import { NextRequest, NextResponse, after } from "next/server";
import { getUserSession } from "@/lib/auth/session";
import { checkSubscription } from "@/lib/auth/subscription";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { chatWithTools, type ConversationMessage } from "@/lib/ai/client";
import { buildFrameSystemPrompt } from "@/lib/ai/prompts";
import { buildWorkingMemoryPrompt, markAlertsSurfaced } from "@/lib/ai/memory/working-memory";
import { incrementValidatedCycles } from "@/lib/ai/memory/beliefs";
import { checkRateLimit } from "@/lib/rate-limit";

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
    const session = await getUserSession();

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Rate limit by userId
    const { allowed, retryAfterMs } = await checkRateLimit(`chat:${session.userId}`, {
      maxRequests: 20,
      windowMs: 60_000,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((retryAfterMs ?? 60_000) / 1000)) },
        }
      );
    }

    // Check for active subscription
    const { hasActiveSubscription, error: subscriptionError } =
      await checkSubscription();

    if (!hasActiveSubscription) {
      return NextResponse.json(
        {
          error: "Active subscription required",
          code: "SUBSCRIPTION_REQUIRED",
          message: subscriptionError,
        },
        { status: 403 }
      );
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
        where: { id: conversationId, userId: session.userId },
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
          userId: session.userId,
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

    // Build structured conversation history (only include valid USER/ASSISTANT roles)
    const VALID_ROLES = new Set(["USER", "ASSISTANT"]);
    const conversationHistory: ConversationMessage[] =
      conversation.messages
        .filter(
          (m: { role: string }) =>
            typeof m.role === "string" && VALID_ROLES.has(m.role.toUpperCase())
        )
        .map(
          (m: {
            role: string;
            content: string;
            attachments: Array<{
              type: string;
              name: string;
              mimeType: string;
            }>;
          }) => {
            let content = m.content;
            if (m.attachments && m.attachments.length > 0) {
              const attachmentInfo = m.attachments
                .map((att) =>
                  att.type === "audio"
                    ? `[Voice recording: ${att.name}]`
                    : `[Attached file: ${att.name} (${att.mimeType})]`
                )
                .join(", ");
              content = content
                ? `${content} ${attachmentInfo}`
                : attachmentInfo;
            }
            return {
              role: m.role.toUpperCase() as "USER" | "ASSISTANT",
              content,
            };
          }
        );

    // Build message content for AI including attachment info
    let messageForAI = message || "";
    if (attachments && attachments.length > 0) {
      const attachmentInfo = attachments
        .map((att: AttachmentInput) =>
          att.type === "audio"
            ? `[User sent a voice recording: ${att.name}]`
            : `[User attached a file: ${att.name} (${att.mimeType})]`
        )
        .join("\n");

      messageForAI = messageForAI
        ? `${messageForAI}\n\n${attachmentInfo}`
        : attachmentInfo;
    }

    // Build dynamic system prompt with working memory (pass user message for contextual note surfacing)
    const workingMemory = await buildWorkingMemoryPrompt(session.userId, messageForAI);
    const dynamicSystemPrompt = buildFrameSystemPrompt(workingMemory.prompt);

    // Generate AI response using tool-based approach
    // Timeout at 55s to stay within Vercel's 60s default function timeout
    const AI_TIMEOUT_MS = 55_000;
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), AI_TIMEOUT_MS);

    let aiResult: Awaited<ReturnType<typeof chatWithTools>>;
    try {
      aiResult = await chatWithTools(
        dynamicSystemPrompt,
        messageForAI,
        conversationHistory,
        session.userId,
        abortController.signal
      );
    } catch (error) {
      // Detect abort by inspecting the error itself, not the signal state
      // Broaden detection: AbortError can come from DOMException (browser) or native Error (Node.js)
      const isAbort =
        (error instanceof DOMException && error.name === "AbortError") ||
        (error instanceof Error && error.name === "AbortError");
      if (isAbort) {
        // Create specific timeout error with status for proper HTTP response mapping
        const timeoutError = new Error("AI response timed out");
        (timeoutError as any).status = 504; // Gateway Timeout
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    // Save assistant message with tool call metadata
    // Safe serialization via JSON round-trip (Prisma requires plain JSON).
    // On failure, store null and log details so queryData consumers can safely null-check.
    let serializedToolCalls: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined = undefined;
    if (aiResult.toolCalls) {
      try {
        serializedToolCalls = JSON.parse(JSON.stringify(aiResult.toolCalls));
      } catch (serializeError) {
        const errMsg = serializeError instanceof Error ? serializeError.message : String(serializeError);
        const toolCallNames = aiResult.toolCalls.map((tc) => tc.name);
        console.error(
          "Failed to serialize toolCalls, storing null in queryData.",
          { error: errMsg, toolCallNames, toolCallCount: aiResult.toolCalls.length }
        );
        serializedToolCalls = Prisma.JsonNull;
      }
    }

    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: aiResult.content,
        queryData: serializedToolCalls,
      },
      include: { attachments: true },
    });

    // Post-response: update beliefs + mark alerts surfaced via after() for reliable execution
    after(async () => {
      try {
        const backgroundOps: Promise<unknown>[] = [];
        if (aiResult.toolCalls && aiResult.toolCalls.length > 0) {
          const toolNames = aiResult.toolCalls.map((tc) => tc.name);
          backgroundOps.push(incrementValidatedCycles(session.userId, toolNames));
        }
        backgroundOps.push(markAlertsSurfaced(session.userId, workingMemory.surfacedAlertIds));
        await Promise.allSettled(backgroundOps);
      } catch (err) {
        console.error("Post-response background ops error:", err);
      }
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
        content: aiResult.content,
        createdAt: assistantMessage.createdAt,
        attachments: [],
      },
    });
  } catch (error) {
    // Map timeout errors to 504 Gateway Timeout
    if (error instanceof Error && (error as any).status === 504) {
      console.error("Chat timeout:", error.message);
      return NextResponse.json(
        { error: "AI response timed out. Please try again." },
        { status: 504 }
      );
    }

    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
