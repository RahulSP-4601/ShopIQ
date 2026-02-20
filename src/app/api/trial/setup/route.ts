import { NextRequest, NextResponse } from "next/server";
import { Prisma, MarketplaceType } from "@prisma/client";
import prisma from "@/lib/prisma";
import { hashPassword, validatePassword } from "@/lib/auth/password";
import { createUserSession } from "@/lib/auth/session";
import { sendTrialAccountReadyEmail } from "@/lib/email";

const VALID_MARKETPLACES: string[] = [
  "SHOPIFY", "AMAZON", "EBAY", "ETSY", "WOOCOMMERCE",
  "BIGCOMMERCE", "WIX", "SQUARE", "MAGENTO", "PRESTASHOP",
];

export async function POST(request: NextRequest) {
  try {
    const { token, password, confirmPassword, marketplaces } = await request.json();

    if (!token || !password || !confirmPassword || !marketplaces) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords don't match" }, { status: 400 });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.error }, { status: 400 });
    }

    if (!Array.isArray(marketplaces) || marketplaces.length !== 2) {
      return NextResponse.json({ error: "Please select exactly 2 marketplaces" }, { status: 400 });
    }

    // Check for duplicate marketplaces
    if (new Set(marketplaces).size !== marketplaces.length) {
      return NextResponse.json({ error: "Please select 2 distinct marketplaces" }, { status: 400 });
    }

    if (!marketplaces.every((m: string) => VALID_MARKETPLACES.includes(m))) {
      return NextResponse.json({ error: "Invalid marketplace selection" }, { status: 400 });
    }

    const salesClient = await prisma.salesClient.findUnique({
      where: { trialToken: token },
    });

    if (!salesClient) {
      return NextResponse.json({ error: "Invalid trial link" }, { status: 400 });
    }

    // Check if trial link has expired (30 days from trialSentAt)
    if (!salesClient.trialSentAt) {
      return NextResponse.json({ error: "Trial link expired" }, { status: 400 });
    }
    const expiresAt = new Date(salesClient.trialSentAt);
    expiresAt.setDate(expiresAt.getDate() + 30);
    if (new Date() > expiresAt) {
      return NextResponse.json({ error: "Trial link expired" }, { status: 400 });
    }

    if (salesClient.clientUserId) {
      return NextResponse.json({ error: "Invalid or expired trial link" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    // Calculate trial end date (30 days from now)
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 30);

    // Create user, subscription, marketplace connections, and update sales client in a transaction
    // The transaction handles race conditions - P2002 unique constraint errors are caught below
    let user;
    try {
      user = await prisma.$transaction(async (tx) => {
        // Check for existing accounts inside transaction for atomicity
        const emailLower = salesClient.email.toLowerCase();
        const [existingUser, existingEmployee] = await Promise.all([
          tx.user.findUnique({ where: { email: emailLower } }),
          tx.employee.findUnique({ where: { email: emailLower } }),
        ]);

        if (existingUser || existingEmployee) {
          throw new Error("EMAIL_EXISTS");
        }

        const newUser = await tx.user.create({
          data: {
            name: salesClient.name,
            email: emailLower,
            phone: salesClient.phone || null,
            country: "N/A",
            passwordHash,
          },
        });

        await tx.subscription.create({
          data: {
            userId: newUser.id,
            status: "TRIAL",
            basePrice: 0,
            additionalPrice: 0,
            totalPrice: 0,
            marketplaceCount: 2,
            currentPeriodStart: now,
            currentPeriodEnd: trialEnd,
          },
        });

        // Create marketplace connections as PENDING (client will connect via OAuth on onboarding page)
        for (const mp of marketplaces) {
          await tx.marketplaceConnection.create({
            data: {
              userId: newUser.id,
              marketplace: mp as MarketplaceType,
              status: "PENDING",
            },
          });
        }

        await tx.salesClient.update({
          where: { id: salesClient.id },
          data: { clientUserId: newUser.id, status: "CONTACTED" },
        });

        return newUser;
      });
    } catch (txError) {
      // Handle email already exists (from our check or P2002 unique constraint)
      if (txError instanceof Error && txError.message === "EMAIL_EXISTS") {
        return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 });
      }
      if (
        txError instanceof Prisma.PrismaClientKnownRequestError &&
        txError.code === "P2002"
      ) {
        return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 });
      }
      throw txError;
    }

    // Send account ready email — must await so Vercel doesn't kill the request
    // Never trust Host header in production — only use configured APP_URL
    const origin = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.NODE_ENV !== "production" ? request.nextUrl.origin : undefined);
    if (origin) {
      try {
        await sendTrialAccountReadyEmail({
          name: user.name,
          email: user.email,
          dashboardUrl: `${origin}/chat`,
        });
      } catch (emailErr) {
        console.error("Failed to send trial account ready email:", emailErr instanceof Error ? emailErr.message : emailErr);
      }
    } else {
      console.error("APP_URL is not configured — skipping trial account ready email");
    }

    // Create session (auto-login) - non-fatal, account is already created
    try {
      await createUserSession({
        id: user.id,
        email: user.email,
        name: user.name,
      });
    } catch (sessionError) {
      // Log the error but don't fail the request - user account was created successfully
      const msg = sessionError instanceof Error ? sessionError.message : "Unknown error";
      console.error(`Session creation failed for trial user ${user.id}: ${msg}. User can sign in manually.`);

      // Return success but indicate manual sign-in is needed
      return NextResponse.json({
        success: true,
        redirect: "/signin",
        message: "Account created successfully. Please sign in to continue.",
      });
    }

    return NextResponse.json({
      success: true,
      redirect: "/trial/connect",
    });
  } catch (error) {
    console.error("Trial setup error:", error);
    return NextResponse.json({ error: "Failed to set up trial" }, { status: 500 });
  }
}
