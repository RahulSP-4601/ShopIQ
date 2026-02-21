/**
 * Square Token Refresh Service
 *
 * Handles automatic token refresh with concurrent refresh protection.
 * Square tokens expire after 30 days.
 *
 * Uses a two-tier locking strategy:
 * 1. In-memory locks for same-instance concurrent requests
 * 2. Database-based optimistic locking via updatedAt timestamp for cross-instance protection
 */

import { createHash } from "crypto";
import prisma from "@/lib/prisma";
import { refreshAccessToken, encryptToken, decryptToken } from "./oauth";

/**
 * Produce a non-reversible, deterministic hash of an ID for safe logging.
 * Keeps first 4 chars for partial traceability, appends truncated SHA-256.
 */
function maskId(id: string): string {
  const hash = createHash("sha256").update(id).digest("hex").slice(0, 8);
  return `${id.slice(0, 4)}...${hash}`;
}

// In-memory map to track ongoing refresh operations per user (same instance only)
// For true distributed locking, this is combined with DB-based optimistic locking
const refreshLocks = new Map<string, Promise<string>>();

// Refresh tokens 1 day before expiry
const TOKEN_REFRESH_BUFFER_MS = 24 * 60 * 60 * 1000; // 1 day

// Lock timeout to prevent deadlocks (5 minutes)
const LOCK_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Wrap a promise with a timeout. Rejects with a clear error if the timeout fires first.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label}: timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

/**
 * Check if a Square connection needs token refresh
 */
export function needsTokenRefresh(tokenExpiry: Date | null): boolean {
  if (!tokenExpiry) return true;

  const now = new Date();
  return tokenExpiry.getTime() - now.getTime() < TOKEN_REFRESH_BUFFER_MS;
}

/**
 * Attempt to acquire a database-level refresh lock using optimistic locking.
 * Performs a conditional update (compare-and-set) on updatedAt so only one
 * instance wins the lock. Returns true if lock acquired, false otherwise.
 */
async function tryAcquireDbLock(
  connectionId: string
): Promise<boolean> {
  try {
    // Read current state
    const connection = await prisma.marketplaceConnection.findUnique({
      where: { id: connectionId },
      select: { updatedAt: true, tokenExpiry: true },
    });

    if (!connection) return false;

    // If token was already refreshed by another instance, no lock needed
    if (!needsTokenRefresh(connection.tokenExpiry)) {
      return false;
    }

    // Conditional update: only succeeds if updatedAt hasn't changed since our read.
    // Uses updateMany with a where clause matching both id AND the previously-read updatedAt.
    // If another instance updated between our read and this write, count will be 0.
    const result = await prisma.marketplaceConnection.updateMany({
      where: {
        id: connectionId,
        updatedAt: connection.updatedAt,
      },
      data: {
        updatedAt: new Date(),
      },
    });

    return result.count === 1;
  } catch (error) {
    // On error, fail closed — don't allow uncontrolled concurrent refreshes
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`tryAcquireDbLock failed [connection=${maskId(connectionId)}]: ${msg}`);
    return false;
  }
}

/**
 * Get a valid Square access token for a user.
 * Automatically refreshes if needed.
 *
 * @param userId - The user ID
 * @returns Decrypted access token
 */
export async function getValidSquareToken(userId: string): Promise<string> {
  // Check for existing in-memory refresh FIRST (before any await) to prevent races
  const existingLock = refreshLocks.get(userId);
  if (existingLock) {
    return existingLock;
  }

  // Register the lock IMMEDIATELY with a placeholder promise
  // This prevents race conditions where two calls both pass the check
  let resolve: (token: string) => void;
  let reject: (err: Error) => void;
  const refreshPromise = new Promise<string>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  refreshLocks.set(userId, refreshPromise);

  try {
    // Get the connection
    const connection = await prisma.marketplaceConnection.findUnique({
      where: {
        userId_marketplace: {
          userId,
          marketplace: "SQUARE",
        },
      },
    });

    if (!connection || connection.status !== "CONNECTED") {
      throw new Error("Square not connected for this user");
    }

    if (!connection.accessToken || !connection.refreshToken) {
      throw new Error("Square tokens not found");
    }

    // Use the helper function for consistent null handling
    const requiresRefresh = needsTokenRefresh(connection.tokenExpiry);

    if (!requiresRefresh) {
      // Token is still valid
      const token = decryptToken(connection.accessToken);
      resolve!(token);
      return token;
    }

    // Check if another instance might be refreshing (distributed lock check)
    const lockAcquired = await tryAcquireDbLock(connection.id);
    if (!lockAcquired) {
      // Another instance is refreshing — retry with exponential backoff
      const MAX_RETRIES = 4;
      const BASE_DELAY_MS = 500;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt); // 500, 1000, 2000, 4000ms
        await new Promise((r) => setTimeout(r, delay));

        const freshConnection = await prisma.marketplaceConnection.findUnique({
          where: { id: connection.id },
          select: { accessToken: true, tokenExpiry: true },
        });

        if (freshConnection?.accessToken && !needsTokenRefresh(freshConnection.tokenExpiry)) {
          const token = decryptToken(freshConnection.accessToken);
          resolve!(token);
          return token;
        }
      }

      // After all retries, try to acquire the lock ourselves (the other instance may have failed)
      const retryLock = await tryAcquireDbLock(connection.id);
      if (!retryLock) {
        throw new Error(
          "Square token refresh: unable to acquire lock after retries. " +
          "Another instance may still be refreshing. Please retry."
        );
      }
    }

    // Re-query connection after lock to get latest tokens (may have been rotated)
    const freshConn = await prisma.marketplaceConnection.findUnique({
      where: { id: connection.id },
      select: { accessToken: true, refreshToken: true, tokenExpiry: true },
    });

    if (!freshConn?.refreshToken) {
      throw new Error("Square connection lost during refresh lock acquisition");
    }

    // Another instance may have completed the refresh between lock checks
    if (!needsTokenRefresh(freshConn.tokenExpiry)) {
      if (!freshConn.accessToken) {
        throw new Error("Square accessToken missing after refresh lock acquisition");
      }
      const token = decryptToken(freshConn.accessToken);
      resolve!(token);
      return token;
    }

    // Perform the refresh with timeout to prevent callers from waiting forever
    const token = await withTimeout(
      performRefresh(userId, connection.id, freshConn.refreshToken),
      LOCK_TIMEOUT_MS,
      "Square token refresh"
    );

    resolve!(token);
    return token;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const wrappedError = new Error(
      `Square token refresh failed: ${message}`
    );
    reject!(wrappedError);
    throw wrappedError;
  } finally {
    // Always clean up the lock
    refreshLocks.delete(userId);
  }
}

/**
 * Perform the actual token refresh
 */
async function performRefresh(
  userId: string,
  connectionId: string,
  encryptedRefreshToken: string
): Promise<string> {
  let decryptedRefreshToken: string;

  try {
    decryptedRefreshToken = decryptToken(encryptedRefreshToken);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Decryption failed";
    throw new Error(`Failed to decrypt refresh token: ${message}`);
  }

  // Step 1: Call the Square API to refresh the token
  let newAccessToken: string;
  let encryptedAccessToken: string;
  let encryptedNewRefreshToken: string;
  let expiresAt: Date;
  let merchantId: string | undefined;

  try {
    const result = await refreshAccessToken(decryptedRefreshToken);
    newAccessToken = result.accessToken;
    encryptedAccessToken = encryptToken(result.accessToken);
    encryptedNewRefreshToken = encryptToken(result.refreshToken);
    expiresAt = result.expiresAt;
    merchantId = result.merchantId;
  } catch (error) {
    // API refresh failed — nothing was rotated, safe to retry later
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(
      `Square token refresh API call failed [user=${maskId(userId)}, connection=${maskId(connectionId)}]: ${errorMessage}`
    );
    throw new Error("Square token refresh failed. Please reconnect your account.");
  }

  // Step 2: Persist new tokens with retry — tokens were already rotated by Square,
  // so losing them here means the user must reconnect
  const DB_RETRY_COUNT = 3;
  const DB_RETRY_BASE_MS = 200;
  let persistError: Error | null = null;

  for (let attempt = 0; attempt < DB_RETRY_COUNT; attempt++) {
    try {
      await prisma.marketplaceConnection.update({
        where: { id: connectionId },
        data: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedNewRefreshToken,
          tokenExpiry: expiresAt,
          ...(merchantId ? { externalId: merchantId } : {}),
        },
      });
      // Success — return the new plaintext access token
      return newAccessToken;
    } catch (dbError) {
      persistError = dbError instanceof Error ? dbError : new Error("Unknown DB error");
      console.error(
        `Square token persist attempt ${attempt + 1}/${DB_RETRY_COUNT} failed [connection=${maskId(connectionId)}]: ${persistError.message}`
      );
      if (attempt < DB_RETRY_COUNT - 1) {
        await new Promise((r) => setTimeout(r, DB_RETRY_BASE_MS * Math.pow(2, attempt)));
      }
    }
  }

  // All DB retries exhausted — mark connection as ERROR so user knows to reconnect
  console.error(
    `Square token refresh: all ${DB_RETRY_COUNT} DB persist attempts failed [user=${maskId(userId)}, connection=${maskId(connectionId)}]. Tokens rotated but not saved.`
  );
  try {
    await prisma.marketplaceConnection.update({
      where: { id: connectionId },
      data: { status: "ERROR" },
    });
  } catch (statusError) {
    console.error(
      `Failed to update connection status to ERROR [connectionId=${maskId(connectionId)}]`
    );
  }

  throw new Error("Square token refresh failed. Please reconnect your account.");
}
