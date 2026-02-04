"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PendingApprovalPage() {
  const router = useRouter();
  const [signOutError, setSignOutError] = useState("");

  // Prevent stale page from bfcache when user presses back after sign-out
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        fetch("/api/auth/verify-employee", { cache: "no-store" }).then((res) => {
          if (!res.ok) router.replace("/signin");
        }).catch(() => router.replace("/signin"));
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [router]);

  const handleSignOut = async () => {
    setSignOutError("");
    try {
      const res = await fetch("/api/auth/signout", { method: "POST" });
      if (!res.ok) {
        setSignOutError("Failed to sign out. Please try again.");
        return;
      }
      router.replace("/signin");
    } catch {
      setSignOutError("Failed to sign out. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-amber-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Pending Approval
          </h1>
          <p className="text-gray-500 mb-8">
            Your account is pending approval from the admin. You&apos;ll be able
            to access your dashboard once your account has been approved.
          </p>
          {signOutError && (
            <p className="text-sm text-red-600 mb-4">{signOutError}</p>
          )}
          <button
            onClick={handleSignOut}
            className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
