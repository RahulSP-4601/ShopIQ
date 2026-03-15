import prisma from "@/lib/prisma";
import { refreshAccessToken } from "./oauth";
import { encryptToken, decryptToken } from "@/lib/shopify/oauth";

// Per-user in-memory lock to prevent concurrent refresh requests within the same instance.
// For cross-instance protection, this is combined with DB-based optimistic locking below.
const refreshLocks = new Map<string, Promise<string>>();

const TOKEN_REFRESH_TIMEOUT_MS = 15_000;
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timerId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms
    );
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timerId);
  });
}

/** Check if Etsy token needs refresh (with 5-minute buffer) */
function needsTokenRefresh(tokenExpiry: Date | null): boolean {
  if (!tokenExpiry) return true;
  return tokenExpiry.getTime() - TOKEN_REFRESH_BUFFER_MS <= Date.now();
}

/**
 * Attempt to acquire a database-level refresh lock using optimistic locking.
 * Performs a conditional update (compare-and-set) on updatedAt so only one
 * instance wins the lock. Returns true if lock acquired, false otherwise.
 */
async function tryAcquireDbLock(connectionId: string): Promise<boolean> {
  try {
    const connection = await prisma.marketplaceConnection.findUnique({
      where: { id: connectionId },
      select: { updatedAt: true, tokenExpiry: true },
    });

    if (!connection) return false;

    // If token was already refreshed by another instance, no lock needed
    if (!needsTokenRefresh(connection.tokenExpiry)) {
      return false;
    }

    // Conditional update: only succeeds if updatedAt hasn't changed since our read
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
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`Etsy tryAcquireDbLock failed [connection=${connectionId}]: ${msg}`);
    return false;
  }
}

/**
 * Get a valid Etsy access token for a user, auto-refreshing if expired.
 *
 * Etsy access tokens expire every 1 hour, so this function is called
 * before every API request. Uses a 5-minute buffer to avoid using
 * nearly-expired tokens.
 *
 * Uses a two-tier locking strategy:
 * 1. In-memory locks for same-instance concurrent requests
 * 2. Database-based optimistic locking via updatedAt timestamp for cross-instance protection
 *
 * Etsy DOES rotate refresh tokens — both access and refresh tokens
 * are replaced on every refresh.
 */
export async function getValidEtsyToken(userId: string): Promise<string> {
  // Check for existing in-flight refresh FIRST (before any await) to prevent races
  const existingLock = refreshLocks.get(userId);
  if (existingLock) {
    return existingLock;
  }

  // Register the lock IMMEDIATELY (before any async operations) so concurrent
  // callers see the in-flight promise atomically. Create deferred promise.
  let resolve: (token: string) => void;
  let reject: (err: Error) => void;
  const refreshPromise = new Promise<string>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  refreshLocks.set(userId, refreshPromise);

  // Now perform async operations. If this function is called again while we're
  // awaiting, the caller will see our lock and wait for our result.
  try {
    const connection = await prisma.marketplaceConnection.findUnique({
      where: { userId_marketplace: { userId, marketplace: "ETSY" } },
    });

    if (!connection) {
      throw new Error("No Etsy connection found for this user");
    }

    if (!connection.accessToken || !connection.refreshToken) {
      throw new Error("Etsy connection exists but access/refresh tokens are missing");
    }

    // If token is still valid (with 5-minute buffer), return decrypted access token
    if (!needsTokenRefresh(connection.tokenExpiry)) {
      const token = decryptToken(connection.accessToken);
      resolve!(token);
      return token;
    }

    // Attempt to acquire DB-level lock for cross-instance protection
    const lockAcquired = await tryAcquireDbLock(connection.id);
    if (!lockAcquired) {
      // Another instance may be refreshing — wait and check for updated token
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
          "Etsy token refresh: unable to acquire lock after retries. " +
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
      throw new Error("Etsy connection lost during refresh lock acquisition");
    }

    // Another instance may have completed the refresh between lock checks
    if (!needsTokenRefresh(freshConn.tokenExpiry)) {
      if (!freshConn.accessToken) {
        throw new Error("Etsy accessToken missing after refresh lock acquisition");
      }
      const token = decryptToken(freshConn.accessToken);
      resolve!(token);
      return token;
    }

    // Token needs refresh - perform the actual refresh with timeout
    const decryptedRefresh = decryptToken(freshConn.refreshToken);
    const { accessToken, refreshToken: newRefreshToken, expiresIn } =
      await withTimeout(
        refreshAccessToken(decryptedRefresh),
        TOKEN_REFRESH_TIMEOUT_MS,
        `Etsy token refresh for user ${userId}`
      );

    // Update DB with new encrypted access token, refresh token, and expiry.
    // Etsy rotates refresh tokens, so both must be persisted before resolving.
    // Retry with exponential backoff to avoid losing rotated tokens on transient DB errors.
    const updateData = {
      accessToken: encryptToken(accessToken),
      refreshToken: encryptToken(newRefreshToken),
      tokenExpiry: new Date(Date.now() + expiresIn * 1000),
    };

    const DB_PERSIST_RETRIES = 3;
    let lastDbError: Error | null = null;
    for (let attempt = 1; attempt <= DB_PERSIST_RETRIES; attempt++) {
      try {
        await prisma.marketplaceConnection.update({
          where: { userId_marketplace: { userId, marketplace: "ETSY" } },
          data: updateData,
        });
        lastDbError = null;
        break;
      } catch (dbError) {
        lastDbError = dbError instanceof Error ? dbError : new Error("Unknown DB error");
        if (attempt < DB_PERSIST_RETRIES) {
          // Exponential backoff: 100ms, 200ms
          await new Promise((r) => setTimeout(r, 100 * Math.pow(2, attempt - 1)));
        }
      }
    }

    if (lastDbError) {
      // DB persistence failed but token refresh succeeded — return the working token
      // to avoid failing the caller, but log a critical alert for ops monitoring.
      // NOTE: Etsy rotates refresh tokens, so the old refresh token is now invalid.
      // If this token expires before a successful DB write, the user must re-authenticate.
      console.error(
        JSON.stringify({
          level: "CRITICAL",
          event: "etsy_token_db_persist_failure",
          userId,
          retries: DB_PERSIST_RETRIES,
          error: lastDbError.message,
          impact: "Token returned but will NOT survive restart; rotated refresh token may be lost",
        })
      );
    }

    resolve!(accessToken);
    return accessToken;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const wrappedError = new Error(
      `Etsy token refresh failed for user ${userId}: ${message}`
    );
    reject!(wrappedError);
    throw wrappedError;
  } finally {
    refreshLocks.delete(userId);
  }
}
