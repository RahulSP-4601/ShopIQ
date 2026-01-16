import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { startFullSync } from "@/lib/shopify/sync";

export async function POST() {
  try {
    const store = await requireAuth();

    // Start sync in background (don't await)
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
