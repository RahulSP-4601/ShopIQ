import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.userId },
    });

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error("Get subscription error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}
