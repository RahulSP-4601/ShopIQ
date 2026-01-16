import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { getSyncStatus } from "@/lib/shopify/sync";

export async function GET() {
  try {
    const store = await requireAuth();
    const status = await getSyncStatus(store.id);

    return NextResponse.json(status);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to get sync status" },
      { status: 500 }
    );
  }
}
