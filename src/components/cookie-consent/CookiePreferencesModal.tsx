"use client";

import { useState, useContext, useEffect } from "react";
import { CookieConsentContext } from "./CookieConsentProvider";

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

function ToggleSwitch({ enabled, onChange, disabled = false }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => !disabled && onChange(!enabled)}
      className={`relative h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      } ${
        enabled
          ? "bg-gradient-to-r from-teal-500 to-emerald-500"
          : "bg-slate-200"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
          enabled ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

interface CategoryCardProps {
  title: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  icon: React.ReactNode;
}

function CategoryCard({
  title,
  description,
  enabled,
  onChange,
  disabled = false,
  icon,
}: CategoryCardProps) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
      <div className="flex-shrink-0 text-slate-500">{icon}</div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <ToggleSwitch enabled={enabled} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export function CookiePreferencesModal() {
  const context = useContext(CookieConsentContext);

  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  // Sync local state with context state
  useEffect(() => {
    if (context) {
      setAnalytics(context.state.preferences.analytics);
      setMarketing(context.state.preferences.marketing);
    }
  }, [context]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && context) {
        context.closePreferences();
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [context]);

  if (!context) return null;

  const { closePreferences, savePreferences, acceptAll, rejectAll } = context;

  const handleSave = () => {
    savePreferences({ analytics, marketing });
  };

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={closePreferences}
      />

      {/* Modal */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg mx-4 animate-modal-in">
        <div className="bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Cookie Preferences
              </h3>
              <button
                onClick={closePreferences}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Manage your cookie preferences. You can change these settings at
              any time.
            </p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-3">
            <CategoryCard
              title="Necessary Cookies"
              description="Required for core functionality like authentication and security. Cannot be disabled."
              enabled={true}
              onChange={() => {}}
              disabled={true}
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              }
            />

            <CategoryCard
              title="Analytics Cookies"
              description="Help us understand how you use Frame to improve our services."
              enabled={analytics}
              onChange={setAnalytics}
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              }
            />

            <CategoryCard
              title="Marketing Cookies"
              description="Used for personalized advertising and tracking conversions."
              enabled={marketing}
              onChange={setMarketing}
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                  />
                </svg>
              }
            />
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 rounded-b-2xl">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={rejectAll}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Reject All
              </button>
              <button
                onClick={acceptAll}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Accept All
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-emerald-500 rounded-lg hover:from-teal-600 hover:to-emerald-600 shadow-lg shadow-teal-500/25 transition-all"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
