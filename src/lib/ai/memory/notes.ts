import prisma from "@/lib/prisma";

// -------------------------------------------------------
// Types
// -------------------------------------------------------

export interface NoteWithPriority {
  id: string;
  content: string;
  basePriority: number;
  effectivePriority: number;
  escalationLevel: "NORMAL" | "WARNING" | "CRITICAL";
  status: string;
  source: string;
  ttlHours: number;
  hoursRemaining: number;
  createdAt: Date;
  expiresAt: Date;
}

// -------------------------------------------------------
// TTL-Based Priority Escalation (from Forrest's paper)
// -------------------------------------------------------

export function computeEffectivePriority(note: {
  basePriority: number;
  createdAt: Date;
  expiresAt: Date;
}): { effectivePriority: number; escalationLevel: "NORMAL" | "WARNING" | "CRITICAL" } {
  const now = Date.now();
  const totalLifespan = note.expiresAt.getTime() - note.createdAt.getTime();
  if (totalLifespan <= 0) {
    return { effectivePriority: note.basePriority * 2.0, escalationLevel: "CRITICAL" };
  }

  const elapsed = now - note.createdAt.getTime();
  const remainingFraction = Math.max(0, 1.0 - elapsed / totalLifespan);

  if (remainingFraction < 0.05) {
    // < 5% TTL remaining → CRITICAL (2x multiplier)
    return {
      effectivePriority: note.basePriority * 2.0,
      escalationLevel: "CRITICAL",
    };
  }

  if (remainingFraction < 0.20) {
    // 5-20% remaining → WARNING (1.5x multiplier)
    return {
      effectivePriority: note.basePriority * 1.5,
      escalationLevel: "WARNING",
    };
  }

  // > 20% remaining → NORMAL (1x)
  return {
    effectivePriority: note.basePriority,
    escalationLevel: "NORMAL",
  };
}

// -------------------------------------------------------
// CRUD Operations
// -------------------------------------------------------

export async function createNote(
  userId: string,
  content: string,
  ttlHours = 24,
  basePriority = 0.5,
  source: "ai" | "system" | "alert" = "ai"
) {
  if (!userId?.trim()) {
    throw new Error("userId must not be empty");
  }

  const trimmed = content?.trim();
  if (!trimmed) {
    throw new Error("content must not be empty");
  }

  const safeTtl = Math.max(1, Math.min(ttlHours, 168)); // 1h to 7 days
  const safePriority = Math.max(0, Math.min(basePriority, 1));

  const MS_PER_HOUR = 3_600_000;
  const expiresAt = new Date(Date.now() + safeTtl * MS_PER_HOUR);

  return prisma.note.create({
    data: {
      userId,
      content: trimmed,
      basePriority: safePriority,
      source,
      status: "ACTIVE",
      ttlHours: safeTtl,
      expiresAt,
    },
  });
}

export async function getActiveNotes(
  userId: string,
  limit = 10
): Promise<NoteWithPriority[]> {
  if (!userId?.trim()) {
    throw new Error("userId must not be empty");
  }

  const safeLimit = Math.max(1, Math.min(limit, 100));

  const notes = await prisma.note.findMany({
    where: {
      userId,
      status: "ACTIVE",
      expiresAt: { gt: new Date() },
    },
    orderBy: { basePriority: "desc" },
    take: safeLimit * 4, // Fetch extra buffer, will re-sort by effective priority
  });

  return notes
    .map((note) => {
      const { effectivePriority, escalationLevel } =
        computeEffectivePriority(note);
      const hoursRemaining = Math.max(
        0,
        Math.round(
          (note.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)
        )
      );
      return {
        id: note.id,
        content: note.content,
        basePriority: note.basePriority,
        effectivePriority,
        escalationLevel,
        status: note.status,
        source: note.source,
        ttlHours: note.ttlHours,
        hoursRemaining,
        createdAt: note.createdAt,
        expiresAt: note.expiresAt,
      };
    })
    .sort((a, b) => b.effectivePriority - a.effectivePriority)
    .slice(0, safeLimit);
}

export async function dismissNote(noteId: string, userId: string) {
  if (!noteId?.trim()) {
    throw new Error("noteId must not be empty");
  }
  if (!userId?.trim()) {
    throw new Error("userId must not be empty");
  }

  const result = await prisma.note.updateMany({
    where: { id: noteId, userId, status: "ACTIVE" },
    data: { status: "DISMISSED" },
  });

  if (result.count === 0) {
    throw new Error("Note not found, not accessible, or already dismissed");
  }

  return result;
}

export async function markNoteActedOn(noteId: string, userId: string) {
  if (!noteId?.trim()) {
    throw new Error("noteId must not be empty");
  }
  if (!userId?.trim()) {
    throw new Error("userId must not be empty");
  }

  const result = await prisma.note.updateMany({
    where: { id: noteId, userId, status: "ACTIVE" },
    data: { status: "ACTED_ON" },
  });

  if (result.count === 0) {
    throw new Error("Note not found, not accessible, or already acted on");
  }

  return result;
}

// -------------------------------------------------------
// Expiration (called by cleanup cron)
// -------------------------------------------------------

export async function expireOldNotes(): Promise<number> {
  const result = await prisma.note.updateMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });
  return result.count;
}

// -------------------------------------------------------
// Contextual Note Surfacing (from Forrest's paper Section 5)
// -------------------------------------------------------

/**
 * Determine if a note should be surfaced based on contextual relevance.
 *
 * Surfaces a note when:
 * 1. Note's escalationLevel === "CRITICAL" (always surfaced regardless of priority)
 * 2. Note content overlaps with entities mentioned in the current context
 */
export function shouldSurfaceNote(
  note: NoteWithPriority,
  contextEntities: string[]
): boolean {
  // Always surface critical notes by escalation level
  if (note.escalationLevel === "CRITICAL") {
    return true;
  }

  // Surface if contextually relevant — check keyword overlap
  if (contextEntities.length === 0) return false;

  const noteWords = extractEntities(note.content);
  const contextSet = new Set(contextEntities.map((e) => e.toLowerCase()));

  for (const word of noteWords) {
    if (contextSet.has(word)) return true;
  }

  return false;
}

/**
 * Extract meaningful entities (keywords) from text.
 * Simple keyword extraction: normalize, lowercase, split, filter stop words and short tokens.
 * Unicode-aware: preserves accented letters (é, ñ), CJK characters, etc.
 */
function extractEntities(text: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "to", "of", "in", "for",
    "on", "with", "at", "by", "from", "as", "into", "about", "like",
    "through", "after", "over", "between", "out", "up", "down", "off",
    "and", "but", "or", "not", "no", "so", "if", "than", "too", "very",
    "just", "that", "this", "it", "its", "they", "them", "their", "we",
    "our", "you", "your", "he", "she", "him", "her", "his", "i", "me",
    "my", "check", "review", "look", "follow", "remember", "note",
  ]);

  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
}

/**
 * Extract entities from user message for contextual matching.
 */
export function extractContextEntities(userMessage: string): string[] {
  return extractEntities(userMessage);
}

/**
 * Get active notes with contextual boosting.
 * Notes that match context entities get a 1.5x priority boost.
 */
export async function getContextualNotes(
  userId: string,
  contextEntities: string[],
  limit = 10
): Promise<NoteWithPriority[]> {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  // getActiveNotes has internal 100-item cap, so bound fetch to that limit
  const fetchLimit = Math.min(safeLimit * 2, 100);
  const notes = await getActiveNotes(userId, fetchLimit);

  // Apply contextual boost
  const boosted = notes.map((note) => {
    const isRelevant = shouldSurfaceNote(note, contextEntities);
    if (isRelevant && note.escalationLevel === "NORMAL") {
      return {
        ...note,
        effectivePriority: Math.min(note.effectivePriority * 1.5, 2.0),
      };
    }
    return note;
  });

  return boosted
    .sort((a, b) => b.effectivePriority - a.effectivePriority)
    .slice(0, safeLimit);
}

export async function cleanupOldNotes(olderThanDays = 30): Promise<number> {
  if (!Number.isFinite(olderThanDays) || olderThanDays < 1) {
    throw new RangeError(
      `cleanupOldNotes: olderThanDays must be a positive number, got ${olderThanDays}`
    );
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);

  const result = await prisma.note.deleteMany({
    where: {
      status: { in: ["EXPIRED", "DISMISSED", "ACTED_ON"] },
      updatedAt: { lt: cutoff },
    },
  });
  return result.count;
}
