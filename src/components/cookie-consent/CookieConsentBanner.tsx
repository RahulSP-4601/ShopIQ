"use client";

import { useContext } from "react";
import Link from "next/link";
import { CookieConsentContext } from "./CookieConsentProvider";

export function CookieConsentBanner() {
  const context = useContext(CookieConsentContext);

  if (!context) return null;

  const { acceptAll, rejectAll, openPreferences } = context;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up bg-white/95 backdrop-blur-xl border-t border-slate-200/50 shadow-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Icon and Text */}
          <div className="flex items-start gap-3 flex-1">
            <div className="flex-shrink-0 mt-0.5">
              <svg
                className="h-5 w-5 text-teal-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-700">
                We use cookies to improve your experience and analyze site
                usage.{" "}
                <Link
                  href="/cookies"
                  className="text-teal-600 hover:text-teal-700 underline underline-offset-2"
                >
                  Learn more
                </Link>
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={openPreferences}
              className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Customize
            </button>
            <button
              onClick={rejectAll}
              className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Reject All
            </button>
            <button
              onClick={acceptAll}
              className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-emerald-500 rounded-lg hover:from-teal-600 hover:to-emerald-600 shadow-lg shadow-teal-500/25 transition-all"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
