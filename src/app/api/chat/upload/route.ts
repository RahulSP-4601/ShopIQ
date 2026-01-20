import { NextRequest, NextResponse } from "next/server";
import { uploadFile, STORAGE_BUCKET, supabase } from "@/lib/supabase";
import { getStore } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const store = await getStore();
    if (!store) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!supabase) {
      return NextResponse.json(
        {
          error:
            "Storage not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment.",
        },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (10MB max)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      // Images
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      // Documents
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
      "text/plain",
      // Audio
      "audio/webm",
      "audio/mp3",
      "audio/mpeg",
      "audio/wav",
      "audio/ogg",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} is not allowed` },
        { status: 400 }
      );
    }

    // Generate unique path scoped to store ID
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 11);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const path = `stores/${store.id}/${timestamp}-${randomId}-${sanitizedName}`;

    // Upload to Supabase Storage
    const { url, error } = await uploadFile(file, path);

    if (error) {
      console.error("Upload error:", error);
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // Determine attachment type
    const type = file.type.startsWith("audio/") ? "audio" : "file";

    return NextResponse.json({
      success: true,
      attachment: {
        type,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        url,
        path,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Configure route segment for file uploads
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
