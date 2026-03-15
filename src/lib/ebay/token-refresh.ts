import prisma from "@/lib/prisma";
import { refreshAccessToken } from "./oauth";
import { encryptToken, decryptToken } from "@/lib/shopify/oauth";

// Per-user lock to prevent concurrent refresh requests from triggering
// duplicate token refreshes. Maps userId to an in-flight refresh promise.
const refreshLocks = new Map<string, Promise<string>>();

const TOKEN_REFRESH_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/**
 * Get a valid eBay access token for a user, auto-refreshing if expired.
 *
 * eBay access tokens expire every 2 hours, so this function is called
 * before every API request. Uses a 10-minute buffer to avoid using
 * nearly-expired tokens.
 *
 * eBay does NOT rotate refresh tokens — only the access token is replaced.
 * The refresh token stays valid for 18 months.
 */
export async function getValidEbayToken(userId: string): Promise<string> {
  const connection = await prisma.marketplaceConnection.findUnique({
    where: { userId_marketplace: { userId, marketplace: "EBAY" } },
  });

  if (!connection?.accessToken || !connection.refreshToken) {
    throw new Error("No eBay connection found");
  }

  // If token is still valid (with 10-minute buffer), return decrypted access token
  const bufferMs = 10 * 60 * 1000;
  if (
    connection.tokenExpiry &&
    connection.tokenExpiry.getTime() - bufferMs > Date.now()
  ) {
    return decryptToken(connection.accessToken);
  }

  // If a refresh is already in-flight for this user, wait for it.
  // Check + set are synchronous (no await between them) so no interleaving
  // is possible in single-threaded JS, but we keep them adjacent for clarity.
  const existing = refreshLocks.get(userId);
  if (existing) {
    return existing;
  }

  // Create deferred promise and register the lock immediately so any
  // concurrent caller that runs after this point will see the in-flight promise.
  let resolve: (token: string) => void;
  let reject: (err: Error) => void;
  const refreshPromise = new Promise<string>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  refreshLocks.set(userId, refreshPromise);

  // Perform the actual refresh asynchronously
  (async () => {
    try {
      const decryptedRefresh = decryptToken(connection.refreshToken!);
      const { accessToken, expiresIn } = await withTimeout(
        refreshAccessToken(decryptedRefresh),
        TOKEN_REFRESH_TIMEOUT_MS,
        `eBay token refresh for user ${userId}`
      );

      // Update DB with new encrypted access token and expiry
      // Refresh token stays the same (eBay doesn't rotate it)
      await prisma.marketplaceConnection.update({
        where: { userId_marketplace: { userId, marketplace: "EBAY" } },
        data: {
          accessToken: encryptToken(accessToken),
          tokenExpiry: new Date(Date.now() + expiresIn * 1000),
        },
      });

      resolve!(accessToken);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      reject!(
        new Error(
          `eBay token refresh failed for user ${userId}: ${message}`
        )
      );
    } finally {
      refreshLocks.delete(userId);
    }
  })();

  return refreshPromise;
}
