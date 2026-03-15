import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApprovedSalesMember } from "@/lib/auth/session";
import { sendTrialInviteEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireApprovedSalesMember();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const salesClient = await prisma.salesClient.findFirst({
      where: { id, salesMemberId: user.id },
    });

    if (!salesClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (salesClient.trialToken) {
      return NextResponse.json({ error: "Trial already sent to this client" }, { status: 400 });
    }

    const trialToken = crypto.randomUUID();
    const previousStatus = salesClient.status;

    // Use both id and salesMemberId in where clause to prevent TOCTOU race
    const updated = await prisma.salesClient.updateMany({
      where: { id, salesMemberId: user.id, trialToken: null },
      data: {
        trialToken,
        trialSentAt: new Date(),
        status: "CONTACTED",
      },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Trial already sent to this client" }, { status: 400 });
    }

    // Never trust Host header in production — only use configured APP_URL
    const origin = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.NODE_ENV !== "production" ? request.nextUrl.origin : undefined);
    if (!origin) {
      try {
        const rollbackResult = await prisma.salesClient.updateMany({
          where: { id, salesMemberId: user.id, trialToken },
          data: {
            trialToken: null,
            trialSentAt: null,
            status: previousStatus,
          },
        });
        if (rollbackResult.count === 0) {
          console.error(
            "Failed to rollback salesClient update via prisma.salesClient.updateMany (missing APP_URL): no rows updated",
            {
              clientId: id,
              salesMemberId: user.id,
              trialToken,
              count: rollbackResult.count,
            }
          );
          return NextResponse.json(
            { error: "Failed to rollback sales client state after configuration error." },
            { status: 500 }
          );
        }
      } catch (rollbackErr) {
        console.error(
          "Failed to rollback salesClient update via prisma.salesClient.updateMany (missing APP_URL)",
          {
            clientId: id,
            salesMemberId: user.id,
            trialToken,
            rollbackErr,
          }
        );
        return NextResponse.json(
          { error: "Failed to rollback sales client state after configuration error." },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: "Server configuration error: APP_URL is required in production" },
        { status: 500 }
      );
    }
    const trialLink = `${origin}/trial/${trialToken}`;

    // Send trial invite email to client — must await so Vercel doesn't kill the request
    try {
      await sendTrialInviteEmail({
        name: salesClient.name,
        email: salesClient.email,
        trialLink,
      });
    } catch (emailErr) {
      const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
      console.error("Failed to send trial invite email:", msg);

      try {
        const rollbackResult = await prisma.salesClient.updateMany({
          where: { id, salesMemberId: user.id, trialToken },
          data: {
            trialToken: null,
            trialSentAt: null,
            status: previousStatus,
          },
        });
        if (rollbackResult.count === 0) {
          console.error(
            "Failed to rollback salesClient update via prisma.salesClient.updateMany (email send failure): no rows updated",
            {
              clientId: id,
              salesMemberId: user.id,
              trialToken,
              count: rollbackResult.count,
            }
          );
          return NextResponse.json(
            { error: "Failed to send invitation email and rollback trial state." },
            { status: 500 }
          );
        }
      } catch (rollbackErr) {
        console.error(
          "Failed to rollback salesClient update via prisma.salesClient.updateMany (rollbackErr):",
          {
            clientId: id,
            salesMemberId: user.id,
            trialToken,
            rollbackErr,
          }
        );
        return NextResponse.json(
          { error: "Failed to send invitation email and rollback trial state." },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: "Failed to send invitation email. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, trialLink });
  } catch {
    return NextResponse.json({ error: "Failed to send trial" }, { status: 500 });
  }
}
