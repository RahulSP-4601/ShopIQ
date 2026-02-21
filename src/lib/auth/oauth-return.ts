import { cookies } from "next/headers";

const COOKIE_NAME = "frame_oauth_return";

/** Allowlist of paths the OAuth callback can redirect to */
const ALLOWED_RETURN_PATHS = new Set(["/trial/connect", "/onboarding/connect"]);

const DEFAULT_RETURN_PATH = "/onboarding/connect";

/**
 * Read the OAuth return cookie set by the connect page, validate it
 * against the allowlist, and delete the cookie.
 *
 * Returns a safe redirect path (always from the allowlist).
 */
export async function consumeOAuthReturnPath(): Promise<string> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  cookieStore.delete({ name: COOKIE_NAME, path: "/" });

  if (raw && ALLOWED_RETURN_PATHS.has(raw)) {
    return raw;
  }
  return DEFAULT_RETURN_PATH;
}
