/**
 * Sanitize marketplace API responses before persisting to rawData.
 * Strips sensitive authentication, payment, and identity fields.
 */

// Keys to redact (matched case-insensitively)
const SENSITIVE_KEY_PATTERNS: RegExp[] = [
  // Auth / tokens
  /^(access[_-]?token|refresh[_-]?token|token|secret|api[_-]?key|authorization|password|credential|client[_-]?secret|consumer[_-]?secret|auth[_-]?header|bearer)$/i,
  // Payment details
  /^(credit[_-]?card|card[_-]?number|cvv|cvc|expiry|expiration[_-]?date|account[_-]?number|routing[_-]?number|bank[_-]?account|payment[_-]?token)$/i,
  // Government IDs
  /^(ssn|social[_-]?security|tax[_-]?id|driver[_-]?license|passport[_-]?number)$/i,
];

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Recursively sanitize an object by redacting sensitive keys.
 * Returns a new object — does not mutate the input.
 * Uses a WeakSet to guard against circular references.
 */
export function sanitizeMarketplaceResponse<T>(data: T): T {
  return sanitizeHelper(data, new WeakSet());
}

function sanitizeHelper<T>(data: T, seen: WeakSet<object>): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== "object") {
    return data;
  }

  // Guard against circular references
  if (seen.has(data as object)) {
    return "[Circular]" as unknown as T;
  }
  seen.add(data as object);

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeHelper(item, seen)) as unknown as T;
  }

  // Preserve built-in object types that would be destroyed by Object.entries
  if (data instanceof Date || data instanceof RegExp) {
    return data;
  }
  if (data instanceof Map) {
    const sanitizedMap = new Map();
    for (const [key, value] of data) {
      const sanitizedKey = typeof key === "string" && isSensitiveKey(key) ? key : sanitizeHelper(key, seen);
      const sanitizedValue = typeof key === "string" && isSensitiveKey(key) ? "[REDACTED]" : sanitizeHelper(value, seen);
      sanitizedMap.set(sanitizedKey, sanitizedValue);
    }
    return sanitizedMap as unknown as T;
  }
  if (data instanceof Set) {
    const sanitizedSet = new Set();
    for (const item of data) {
      sanitizedSet.add(sanitizeHelper(item, seen));
    }
    return sanitizedSet as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      result[key] = sanitizeHelper(value, seen);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}
