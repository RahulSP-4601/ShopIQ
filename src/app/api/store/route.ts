import { NextResponse } from "next/server";
import { getStore, deleteSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const store = await getStore();

    if (!store) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json({
      id: store.id,
      domain: store.domain,
      name: store.name,
      email: store.email,
      currency: store.currency,
      timezone: store.timezone,
      syncStatus: store.syncStatus,
      lastSyncedAt: store.lastSyncedAt,
      productsCount: store.productsCount,
      customersCount: store.customersCount,
      ordersCount: store.ordersCount,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to get store" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const store = await getStore();

    if (!store) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Delete store and all related data (cascade)
    await prisma.store.delete({
      where: { id: store.id },
    });

    // Delete session
    await deleteSession();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to disconnect store" },
      { status: 500 }
    );
  }
}
