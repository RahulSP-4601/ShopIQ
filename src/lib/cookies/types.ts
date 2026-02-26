export interface CookiePreferences {
  necessary: boolean; // Always true, cannot be disabled
  analytics: boolean; // Usage tracking, error logging
  marketing: boolean; // Ad targeting, remarketing
}

export interface CookieConsentState {
  hasConsented: boolean;
  preferences: CookiePreferences;
  consentDate: string | null;
  consentVersion: string;
}

export interface CookieConsentContextValue {
  state: CookieConsentState;
  isLoading: boolean;
  showBanner: boolean;
  showPreferences: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  savePreferences: (prefs: Partial<CookiePreferences>) => void;
  openPreferences: () => void;
  closePreferences: () => void;
  resetConsent: () => void;
}
