"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface ChatHeaderProps {
  userName: string;
  userEmail: string;
  marketplaceCount: number;
  subscriptionStatus?: string | null;
  trialEndsAt?: string | null;
  onMenuToggle?: () => void;
}

export function ChatHeader({
  userName,
  userEmail,
  marketplaceCount,
  subscriptionStatus,
  trialEndsAt,
  onMenuToggle,
}: ChatHeaderProps) {
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check if user is still authenticated with retry logic for transient network errors
  const checkAuth = useCallback(async (retryCount = 0) => {
    const MAX_RETRIES = 2;
    const RETRY_DELAY = 1000; // 1 second

    try {
      const response = await fetch("/api/auth/me", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });

      if (response.ok) {
        return; // Authenticated
      }

      // Only redirect on definitive auth failures (401/403)
      if (response.status === 401 || response.status === 403) {
        router.replace("/signin");
        return;
      }

      // For other HTTP errors, retry if attempts remain
      if (retryCount < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        return checkAuth(retryCount + 1);
      }

      // Exhausted retries, redirect
      router.replace("/signin");
    } catch {
      // Network error - retry for transient failures
      if (retryCount < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        return checkAuth(retryCount + 1);
      }

      // Exhausted retries on network errors, redirect
      router.replace("/signin");
    }
  }, [router]);

  // Check auth on visibility change (e.g., user comes back via back button)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAuth();
      }
    };

    // Check auth on popstate (browser back/forward)
    const handlePopState = () => {
      checkAuth();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [checkAuth]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setSignOutError(null);
    try {
      const response = await fetch("/api/auth/signout", { method: "POST" });

      if (response.ok) {
        // Use replace to prevent back button from returning to this page
        router.replace("/signin");
      } else {
        // Sign-out failed - show error to user
        setSignOutError("Failed to sign out. Please try again.");
      }
    } catch (error) {
      console.error("Sign out error:", error);
      setSignOutError("Failed to sign out. Please try again.");
    }
  };

  // Get user initials for avatar - handle empty/malformed userName
  const initials =
    (userName || "")
      .split(" ")
      .filter((n) => n.length > 0)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
      {/* Left side - Menu button and Logo */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Hamburger menu button - mobile only */}
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden transition-colors"
          aria-label="Open menu"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <Link href="/" className="flex items-center gap-2 sm:gap-3">
          <Image
            src="/logo.png"
            alt="ShopIQ"
            width={62}
            height={62}
            className="object-contain h-10 w-10 sm:h-[62px] sm:w-[62px]"
            priority
          />
          <span className="text-lg sm:text-xl font-bold text-slate-900 hidden xs:inline">ShopIQ</span>
        </Link>
      </div>

      {/* Right side - User profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Trial countdown */}
        {subscriptionStatus === "TRIAL" && trialEndsAt && (() => {
          const trialDate = new Date(trialEndsAt);
          if (isNaN(trialDate.getTime())) return null;
          const daysLeft = Math.max(0, Math.ceil((trialDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
          return (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm text-slate-500">
                {daysLeft} day{daysLeft !== 1 ? "s" : ""} left in trial
              </span>
              <Link
                href="/onboarding/payment"
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Get Subscription
              </Link>
            </div>
          );
        })()}

        {/* Connected badge - only show when marketplaces are connected, hide on mobile */}
        {marketplaceCount > 0 ? (
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-sm text-teal-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500"></span>
            </span>
            {marketplaceCount} marketplace{marketplaceCount !== 1 ? "s" : ""}{" "}
            connected
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-sm text-amber-700">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400"></span>
            </span>
            No marketplaces connected
          </div>
        )}

        {/* User profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 transition-colors hover:bg-slate-50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-sm font-semibold text-white">
              {initials}
            </div>
            <span className="text-sm font-medium text-slate-700 hidden sm:inline">
              {userName}
            </span>
            <svg
              className={`h-4 w-4 text-slate-400 transition-transform ${showDropdown ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Dropdown menu */}
          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-slate-200 bg-white py-2 shadow-xl z-50">
              {/* User info */}
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900">
                  {userName}
                </p>
                <p className="text-xs text-slate-500">{userEmail}</p>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    router.push("/account/marketplaces");
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <svg
                    className="h-4 w-4 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                  Manage Marketplaces
                </button>

                <button
                  onClick={() => {
                    setShowDropdown(false);
                    router.push("/reports");
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <svg
                    className="h-4 w-4 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Reports
                </button>
              </div>

              {/* Sign out */}
              <div className="border-t border-slate-100 py-1">
                {signOutError && (
                  <p className="px-4 py-2 text-xs text-red-600 bg-red-50">
                    {signOutError}
                  </p>
                )}
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
