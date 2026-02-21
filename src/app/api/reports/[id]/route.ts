import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getUserSession();

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    const report = await prisma.report.findFirst({
      where: { id, userId: session.userId },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch {
    return NextResponse.json(
      { error: "Failed to get report" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getUserSession();

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    const report = await prisma.report.findFirst({
      where: { id, userId: session.userId },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    await prisma.report.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete report" },
      { status: 500 }
    );
  }
}
