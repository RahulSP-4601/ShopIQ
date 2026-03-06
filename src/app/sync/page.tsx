import { redirect } from "next/navigation";
import { getUserSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export default async function SyncPage() {
  const session = await getUserSession();

  if (!session) {
    redirect("/");
  }

  // Check if user has any connected marketplaces
  let connectedCount = 0;
  try {
    connectedCount = await prisma.marketplaceConnection.count({
      where: { userId: session.userId, status: "CONNECTED" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`Sync page: Failed to query marketplace connections for user ${session.userId}: ${msg}`);
    // On DB failure, redirect to chat as a safe default rather than crashing
    redirect("/chat");
  }

  if (connectedCount === 0) {
    // No marketplaces connected, redirect to onboarding
    redirect("/onboarding/connect");
  }

  // Marketplaces connected — sync is handled by cron, redirect to chat
  redirect("/chat");
}
