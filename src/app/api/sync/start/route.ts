import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { startFullSync } from "@/lib/shopify/sync";

export async function POST() {
  try {
    const store = await requireAuth();

    // Prevent concurrent syncs
    if (store.syncStatus === "SYNCING") {
      return NextResponse.json({
        status: "syncing",
        message: "Sync already in progress",
      });
    }

    // Start sync in background (don't await)
    // NOTE: In serverless environments (e.g., Vercel), this fire-and-forget pattern
    // may cause incomplete syncs if the function instance is recycled. Consider using
    // a background job queue (Inngest, QStash) or Next.js unstable_after for production.
    startFullSync(store).catch((error) => {
      console.error("Sync error:", error);
    });

    return NextResponse.json({
      status: "syncing",
      message: "Sync started",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to start sync" },
      { status: 500 }
    );
  }
}
