import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { requireFounder } from "@/lib/auth/session";
import { sendTrialInviteEmail } from "@/lib/email";

async function rollbackTrialInvite(
  salesClientId: string,
  waitlistEntryId: string
): Promise<NextResponse | null> {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.waitlistEntry.update({
        where: { id: waitlistEntryId },
        data: {
          status: "PENDING",
          trialToken: null,
          trialSentAt: null,
          salesClientId: null,
          invitedByEmployeeId: null,
        },
      });
      await tx.salesClient.delete({
        where: { id: salesClientId },
      });
    });
    return null;
  } catch (rollbackErr) {
    console.error(
      "Failed to rollback waitlist trial invite via prisma.$transaction (tx.salesClient.delete + tx.waitlistEntry.update):",
      rollbackErr
    );
    return NextResponse.json(
      {
        error:
          "Failed to send invitation email and rollback trial state. Partial failure occurred; manual intervention may be required.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let founder;
  try {
    founder = await requireFounder();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const waitlistEntry = await prisma.waitlistEntry.findUnique({
      where: { id },
      select: {
        id: true,
        companyName: true,
        email: true,
        phone: true,
        status: true,
        trialToken: true,
      },
    });

    if (!waitlistEntry) {
      return NextResponse.json({ error: "Waitlist entry not found" }, { status: 404 });
    }

    if (waitlistEntry.trialToken || waitlistEntry.status === "TRIAL_SENT") {
      return NextResponse.json({ error: "Free trial already sent" }, { status: 400 });
    }

    const origin =
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.NODE_ENV !== "production" ? request.nextUrl.origin : undefined);

    const trialToken = crypto.randomUUID();
    const now = new Date();
    const trialLink = origin ? `${origin}/trial/${trialToken}` : undefined;

    if (!trialLink) {
      return NextResponse.json(
        { error: "Server configuration error: APP_URL is required" },
        { status: 500 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const salesClient = await tx.salesClient.create({
        data: {
          salesMemberId: founder.id,
          name: waitlistEntry.companyName,
          email: waitlistEntry.email,
          phone: waitlistEntry.phone,
          status: "CONTACTED",
          trialToken,
          trialSentAt: now,
        },
        select: { id: true },
      });

      const updatedWaitlist = await tx.waitlistEntry.updateMany({
        where: { id: waitlistEntry.id, trialToken: null },
        data: {
          status: "TRIAL_SENT",
          trialToken,
          trialSentAt: now,
          salesClientId: salesClient.id,
          invitedByEmployeeId: founder.id,
        },
      });

      if (updatedWaitlist.count === 0) {
        throw new Error("TRIAL_ALREADY_SENT");
      }

      return salesClient;
    });

    try {
      await sendTrialInviteEmail({
        name: waitlistEntry.companyName,
        email: waitlistEntry.email,
        trialLink,
      });
    } catch (emailErr) {
      const message = emailErr instanceof Error ? emailErr.message : String(emailErr);
      console.error("Failed to send waitlist trial email:", message);

      const rollbackFailureResponse = await rollbackTrialInvite(
        result.id,
        waitlistEntry.id
      );
      if (rollbackFailureResponse) {
        console.error("Original sendTrialInviteEmail error (emailErr):", emailErr);
        return rollbackFailureResponse;
      }

      return NextResponse.json(
        { error: "Failed to send invitation email. Please try again." },
        { status: 502 }
      );
    }

    const responseBody: { success: true; salesClientId: string; trialLink?: string } = {
      success: true,
      salesClientId: result.id,
    };
    responseBody.trialLink = trialLink;

    return NextResponse.json(responseBody);
  } catch (error) {
    if (error instanceof Error && error.message === "TRIAL_ALREADY_SENT") {
      return NextResponse.json({ error: "Free trial already sent" }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to send waitlist trial:", message);
    return NextResponse.json({ error: "Failed to send free trial" }, { status: 500 });
  }
}
