"use client";

import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { CookieConsentBanner } from "./CookieConsentBanner";
import { CookiePreferencesModal } from "./CookiePreferencesModal";
import {
  getStoredConsent,
  storeConsent,
  clearConsent,
  defaultState,
  CONSENT_VERSION,
} from "@/lib/cookies/storage";
import type {
  CookieConsentContextValue,
  CookieConsentState,
  CookiePreferences,
} from "@/lib/cookies/types";

export const CookieConsentContext =
  createContext<CookieConsentContextValue | null>(null);

export function CookieConsentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<CookieConsentState>(defaultState);
  const [isLoading, setIsLoading] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  // Hydration-safe localStorage read
  useEffect(() => {
    const stored = getStoredConsent();
    if (stored) {
      setState(stored);
      setShowBanner(false);
    } else {
      setShowBanner(true);
    }
    setIsLoading(false);
  }, []);

  const acceptAll = useCallback(() => {
    const newState: CookieConsentState = {
      hasConsented: true,
      preferences: { necessary: true, analytics: true, marketing: true },
      consentDate: new Date().toISOString(),
      consentVersion: CONSENT_VERSION,
    };
    setState(newState);
    storeConsent(newState);
    setShowBanner(false);
    setShowPreferences(false);
  }, []);

  const rejectAll = useCallback(() => {
    const newState: CookieConsentState = {
      hasConsented: true,
      preferences: { necessary: true, analytics: false, marketing: false },
      consentDate: new Date().toISOString(),
      consentVersion: CONSENT_VERSION,
    };
    setState(newState);
    storeConsent(newState);
    setShowBanner(false);
    setShowPreferences(false);
  }, []);

  const savePreferences = useCallback(
    (prefs: Partial<CookiePreferences>) => {
      const newState: CookieConsentState = {
        hasConsented: true,
        preferences: { ...state.preferences, ...prefs, necessary: true },
        consentDate: new Date().toISOString(),
        consentVersion: CONSENT_VERSION,
      };
      setState(newState);
      storeConsent(newState);
      setShowBanner(false);
      setShowPreferences(false);
    },
    [state.preferences]
  );

  const openPreferences = useCallback(() => setShowPreferences(true), []);
  const closePreferences = useCallback(() => setShowPreferences(false), []);

  const resetConsent = useCallback(() => {
    clearConsent();
    setState(defaultState);
    setShowBanner(true);
  }, []);

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      state,
      isLoading,
      showBanner,
      showPreferences,
      acceptAll,
      rejectAll,
      savePreferences,
      openPreferences,
      closePreferences,
      resetConsent,
    }),
    [
      state,
      isLoading,
      showBanner,
      showPreferences,
      acceptAll,
      rejectAll,
      savePreferences,
      openPreferences,
      closePreferences,
      resetConsent,
    ]
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
      {!isLoading && showBanner && <CookieConsentBanner />}
      {showPreferences && <CookiePreferencesModal />}
    </CookieConsentContext.Provider>
  );
}
