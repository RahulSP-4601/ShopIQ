import prisma from "@/lib/prisma";
import { refreshAccessToken } from "./oauth";
import { encryptToken, decryptToken } from "@/lib/shopify/oauth";

/**
 * Get a valid Flipkart access token for a user, auto-refreshing if expired.
 * Checks tokenExpiry with a 1-day buffer to avoid using nearly-expired tokens.
 * Updates the database with fresh tokens when a refresh occurs.
 */
export async function getValidFlipkartToken(userId: string): Promise<string> {
  const connection = await prisma.marketplaceConnection.findUnique({
    where: { userId_marketplace: { userId, marketplace: "FLIPKART" } },
  });

  if (!connection?.accessToken || !connection.refreshToken) {
    throw new Error("No Flipkart connection found");
  }

  // If token is still valid (with 1-day buffer), return decrypted access token
  const bufferMs = 24 * 60 * 60 * 1000;
  if (
    connection.tokenExpiry &&
    connection.tokenExpiry.getTime() - bufferMs > Date.now()
  ) {
    return decryptToken(connection.accessToken);
  }

  // Token expired or expiring soon — refresh it
  const decryptedRefresh = decryptToken(connection.refreshToken);
  const { accessToken, refreshToken, expiresIn } =
    await refreshAccessToken(decryptedRefresh);

  // Update DB with new encrypted tokens
  await prisma.marketplaceConnection.update({
    where: { userId_marketplace: { userId, marketplace: "FLIPKART" } },
    data: {
      accessToken: encryptToken(accessToken),
      refreshToken: encryptToken(refreshToken),
      tokenExpiry: new Date(Date.now() + expiresIn * 1000),
    },
  });

  return accessToken;
}
