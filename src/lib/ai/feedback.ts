import prisma from "@/lib/prisma";
import { FeedbackRating } from "@prisma/client";
import { updateBeliefStrength, TOOL_BELIEF_MAP } from "./memory/beliefs";

// -------------------------------------------------------
// Record Feedback
// -------------------------------------------------------

export async function recordFeedback(
  userId: string,
  messageId: string,
  rating: FeedbackRating
): Promise<void> {
  // Wrap ownership check, upsert, and belief updates in a transaction for atomicity
  await prisma.$transaction(async (tx) => {
    // Verify message exists and belongs to this user's conversation (inside transaction)
    const message = await tx.message.findUnique({
      where: { id: messageId },
      select: { conversation: { select: { userId: true } } },
    });

    if (!message || !message.conversation || message.conversation.userId !== userId) {
      throw new Error("Message not found or access denied");
    }

    // Upsert: one rating per message, latest wins
    await tx.messageFeedback.upsert({
      where: { messageId },
      create: { messageId, userId, rating },
      update: { rating },
    });

    // Process for belief updates using the transaction client
    await processFeedbackForBeliefs(tx, userId, messageId, rating);
  });
}

// -------------------------------------------------------
// Map Feedback to Belief Updates
// -------------------------------------------------------

async function processFeedbackForBeliefs(
  tx: Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  userId: string,
  messageId: string,
  rating: FeedbackRating
): Promise<void> {
  // Look up the message to find which tools were called (using transaction client)
  const message = await tx.message.findUnique({
    where: { id: messageId },
    select: { queryData: true, role: true },
  });

  if (!message || message.role !== "ASSISTANT") {
    console.warn(
      `processFeedbackForBeliefs: skipping — message ${messageId} ${!message ? "not found" : `has role "${message.role}" (expected ASSISTANT)`}`
    );
    return;
  }

  const outcome = rating === "POSITIVE" ? "success" : "failure";

  // Extract tool names from queryData (runtime validation of JSON shape)
  const rawToolCalls = message.queryData as unknown;

  const toolCalls: Array<{ name: string }> = Array.isArray(rawToolCalls)
    ? (rawToolCalls as unknown[]).filter(
        (tc): tc is { name: string } => {
          const obj = tc as Record<string, unknown>;
          return typeof obj === "object" && obj !== null && typeof obj.name === "string";
        }
      )
    : [];

  if (toolCalls.length > 0) {
    // Map each tool to its belief statement and update
    const processedStatements = new Set<string>();

    for (const tc of toolCalls) {
      const statement = TOOL_BELIEF_MAP[tc.name];
      if (statement && !processedStatements.has(statement)) {
        processedStatements.add(statement);
        await updateBeliefStrength(userId, statement, outcome, "*", tx as Parameters<typeof updateBeliefStrength>[4]);
      }
    }
  } else {
    // No tool calls — apply to generic conversation belief
    await updateBeliefStrength(
      userId,
      "general_conversation",
      outcome,
      "*",
      tx as Parameters<typeof updateBeliefStrength>[4]
    );
  }
}
