import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase credentials not configured. File uploads will not work."
  );
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const STORAGE_BUCKET = "chat-attachments";

/**
 * Upload a file to Supabase Storage
 * @param file - The file to upload
 * @param path - The path within the bucket (e.g., "user-id/filename.ext")
 * @returns The public URL of the uploaded file
 */
export async function uploadFile(
  file: File | Blob,
  path: string
): Promise<{ url: string; error: Error | null }> {
  if (!supabase) {
    return {
      url: "",
      error: new Error("Supabase not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment."),
    };
  }

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    return { url: "", error: new Error(error.message) };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(data.path);

  return { url: urlData.publicUrl, error: null };
}

/**
 * Delete a file from Supabase Storage
 * @param path - The path of the file to delete
 */
export async function deleteFile(path: string): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error("Supabase not configured") };
  }

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([path]);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}
