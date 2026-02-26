import type { CookieConsentState, CookiePreferences } from "./types";

const STORAGE_KEY = "frame_cookie_consent";
const CONSENT_VERSION = "1.0";

export const defaultPreferences: CookiePreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
};

export const defaultState: CookieConsentState = {
  hasConsented: false,
  preferences: defaultPreferences,
  consentDate: null,
  consentVersion: CONSENT_VERSION,
};

export function getStoredConsent(): CookieConsentState | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as CookieConsentState;

    // Check if consent version matches (re-consent if policy updated)
    if (parsed.consentVersion !== CONSENT_VERSION) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function storeConsent(state: CookieConsentState): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...state,
      consentVersion: CONSENT_VERSION,
    })
  );
}

export function clearConsent(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export { CONSENT_VERSION };
