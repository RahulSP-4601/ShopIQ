import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { syncAllConnections } from "@/lib/sync/sync-manager";

export async function GET(request: NextRequest) {
  // Verify cron secret — Vercel Cron sends this as a Bearer token
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || !authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Extract bearer token and use timing-safe comparison to prevent timing attacks
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Hash both values to fixed-length SHA-256 digests (32 bytes each) so
    // timingSafeEqual never leaks secret length via early length-check exceptions
    const tokenDigest = crypto.createHash("sha256").update(token).digest();
    const secretDigest = crypto.createHash("sha256").update(cronSecret).digest();
    if (!crypto.timingSafeEqual(tokenDigest, secretDigest)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await syncAllConnections();
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Cron sync error:", error);
    // Return 200 to avoid Vercel retrying on transient failures
    return NextResponse.json(
      { success: false, error: "Sync encountered errors" },
      { status: 200 }
    );
  }
}
