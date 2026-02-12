import { encryptToken, decryptToken } from "@/lib/shopify/oauth";
import dns from "dns";
import net from "net";

// Re-export encryption utilities for convenience
export { encryptToken, decryptToken };

/**
 * Check if an IPv4 address falls within private or reserved ranges.
 * Covers all IANA reserved ranges that should not be reached from a server.
 */
function isPrivateOrReservedIPv4(hostname: string): boolean {
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Regex);
  if (!match) return false;

  const rawOctets = match.slice(1);

  // Reject octets with leading zeros (e.g. "010") to prevent octal bypass
  if (rawOctets.some((o) => o.length > 1 && o.startsWith("0"))) return true;

  const octets = rawOctets.map(Number);

  // Validate each octet is 0-255
  if (octets.some((o) => o < 0 || o > 255)) return true; // Invalid = block

  return (
    octets[0] === 0 || // 0.0.0.0/8 — "This network"
    octets[0] === 10 || // 10.0.0.0/8 — Private
    octets[0] === 127 || // 127.0.0.0/8 — Loopback
    (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) || // 100.64.0.0/10 — Carrier-grade NAT
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) || // 172.16.0.0/12 — Private
    (octets[0] === 192 && octets[1] === 168) || // 192.168.0.0/16 — Private
    (octets[0] === 169 && octets[1] === 254) || // 169.254.0.0/16 — Link-local
    (octets[0] === 198 && (octets[1] === 18 || octets[1] === 19)) || // 198.18.0.0/15 — Benchmarking
    octets[0] >= 224 || // 224.0.0.0/4 Multicast + 240.0.0.0/4 Reserved + 255.255.255.255
    (octets[0] === 192 && octets[1] === 0 && octets[2] === 0) || // 192.0.0.0/24 — IETF Protocol
    (octets[0] === 192 && octets[1] === 0 && octets[2] === 2) || // 192.0.2.0/24 — TEST-NET-1
    (octets[0] === 198 && octets[1] === 51 && octets[2] === 100) || // 198.51.100.0/24 — TEST-NET-2
    (octets[0] === 203 && octets[1] === 0 && octets[2] === 113) // 203.0.113.0/24 — TEST-NET-3
  );
}

/**
 * Normalize and validate a user-supplied PrestaShop store URL.
 * Prevents SSRF by rejecting private/reserved IP ranges and localhost.
 *
 * @returns Normalized URL like "https://mystore.com" (no trailing slash)
 * @throws Error if URL is invalid or targets a private/reserved address
 */
export function normalizeStoreUrl(input: string): string {
  let url: URL;

  try {
    let raw = input.trim();
    // Add https:// if no protocol specified
    if (!raw.includes("://")) {
      raw = `https://${raw}`;
    }
    url = new URL(raw);
  } catch {
    throw new Error("Invalid store URL format");
  }

  // Enforce HTTPS
  if (url.protocol !== "https:") {
    throw new Error("Store URL must use HTTPS");
  }

  const hostname = url.hostname.toLowerCase();

  // Block empty hostname
  if (!hostname) {
    throw new Error("Store URL must have a valid hostname");
  }

  // Block localhost variants
  // Note: URL.hostname strips IPv6 brackets, so [::1] becomes "::1"
  if (hostname === "localhost" || hostname === "::1") {
    throw new Error("Store URL cannot point to localhost");
  }

  // Block any IP address detected by net.isIP (covers IPv4, IPv6, and
  // normalized forms like "::1" that URL.hostname may strip brackets from)
  const ipVersion = net.isIP(hostname);
  if (ipVersion === 6) {
    throw new Error("Store URL cannot use IPv6 addresses");
  }
  if (ipVersion === 4) {
    if (isPrivateOrReservedIPv4(hostname)) {
      throw new Error(
        "Store URL cannot point to a private or reserved address"
      );
    }
    // Public IPv4 — allow (some stores use direct IPs)
  }

  // Also catch bracket-wrapped IPv6 that URL may preserve
  if (hostname.startsWith("[") || hostname.includes(":")) {
    throw new Error("Store URL cannot use IPv6 addresses");
  }

  // Must have at least one dot (real domain)
  if (!hostname.includes(".")) {
    throw new Error("Store URL must be a valid domain name");
  }

  // Return normalized URL: origin only (no path, no trailing slash)
  return url.origin;
}

/**
 * Resolve a hostname via DNS and validate that all resolved addresses
 * are public IPv4 (not private, reserved, or IPv6).
 * Prevents DNS rebinding attacks by returning the validated IP addresses
 * so callers can connect directly to them instead of re-resolving.
 *
 * @returns Array of validated public IPv4 addresses. Callers should use
 *          these IPs for the actual HTTP connection (e.g., via a custom
 *          Agent or Host header) to avoid TOCTOU re-resolution.
 * @throws Error if resolution fails or any address is private/reserved/IPv6
 */
export async function resolveAndValidateHost(
  hostname: string
): Promise<string[]> {
  // Validate IP literals the same way we validate resolved addresses
  if (net.isIP(hostname)) {
    const ipVersion = net.isIP(hostname);
    if (ipVersion === 6) {
      throw new Error("Store URL cannot use IPv6 addresses");
    }
    if (ipVersion === 4 && isPrivateOrReservedIPv4(hostname)) {
      throw new Error(
        "Store URL cannot point to a private or reserved IP address"
      );
    }
    return [hostname];
  }

  let addresses: dns.LookupAddress[];
  try {
    addresses = await dns.promises.lookup(hostname, { all: true });
  } catch {
    throw new Error(`Failed to resolve hostname: ${hostname}`);
  }

  const validatedIps: string[] = [];

  for (const addr of addresses) {
    const ipVersion = net.isIP(addr.address);
    if (ipVersion === 6) {
      throw new Error("Store hostname resolved to an IPv6 address");
    }
    if (ipVersion === 4 && isPrivateOrReservedIPv4(addr.address)) {
      throw new Error(
        "Store hostname resolved to a private or reserved IP address"
      );
    }
    if (ipVersion === 4) {
      validatedIps.push(addr.address);
    }
  }

  if (validatedIps.length === 0) {
    throw new Error(`No valid IPv4 addresses found for hostname: ${hostname}`);
  }

  return validatedIps;
}

/**
 * Validate a PrestaShop API key format and return the trimmed key.
 * Checks that the key is a non-empty string between 8 and 128 characters.
 * Does not enforce strict alphanumeric format.
 *
 * @returns The trimmed API key
 * @throws Error if the key is missing or outside the valid length range
 */
export function validateApiKey(key: string): string {
  if (!key || typeof key !== "string") {
    throw new Error("API key is required");
  }

  const trimmed = key.trim();
  if (trimmed.length < 8 || trimmed.length > 128) {
    throw new Error("API key must be between 8 and 128 characters");
  }

  return trimmed;
}
