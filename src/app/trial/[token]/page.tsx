"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { MARKETPLACES } from "@/lib/marketplace/config";

function validatePasswordClient(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one lowercase letter" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one number" };
  }
  return { valid: true };
}

export default function TrialSetupPage() {
  const params = useParams();
  const router = useRouter();
  // rawToken is the decoded token from URL path (Next.js decodes it automatically)
  // Use rawToken for JSON bodies, use encoded token for URL query strings
  const rawToken = params.token as string;
  const encodedToken = rawToken ? encodeURIComponent(rawToken) : "";

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"invalid" | "new" | "active" | "expired">("invalid");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [loginError, setLoginError] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState(false);

  const attemptAutoLogin = useCallback(async () => {
    try {
      const res = await fetch("/api/trial/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: rawToken }),
      });
      const loginData = await res.json();
      if (res.ok) {
        router.push(loginData.redirect || "/chat");
        return true;
      }
    } catch {
      // Fall through
    }
    return false;
  }, [rawToken, router]);

  useEffect(() => {
    if (!encodedToken) {
      setStatus("invalid");
      setLoading(false);
      return;
    }
    fetch(`/api/trial/verify?token=${encodedToken}`)
      .then((res) => res.json())
      .then(async (data) => {
        if (!data.valid) {
          setStatus("invalid");
          setLoading(false);
          return;
        }

        if (data.status === "active") {
          const success = await attemptAutoLogin();
          if (!success) {
            setStatus("active");
            setLoginError("Auto-login failed. Please sign in manually.");
          }
          setLoading(false);
        } else if (data.status === "new") {
          // Only set client info when status is "new" (setup form)
          if (data.clientName) setClientName(data.clientName);
          if (data.clientEmail) setClientEmail(data.clientEmail);
          setStatus("new");
          setLoading(false);
        } else {
          setStatus(data.status);
          setLoading(false);
        }
      })
      .catch(() => {
        setStatus("invalid");
        setLoading(false);
      });
  }, [encodedToken, attemptAutoLogin]);

  const toggleMarketplace = (id: string) => {
    setSelectedMarketplaces((prev) => {
      if (prev.includes(id)) return prev.filter((m) => m !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    const validation = validatePasswordClient(password);
    if (!validation.valid) {
      setError(validation.error!);
      return;
    }

    if (selectedMarketplaces.length !== 2) {
      setError("Please select exactly 2 marketplaces");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/trial/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: rawToken,
          password,
          confirmPassword,
          marketplaces: selectedMarketplaces,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      router.push(data.redirect || "/onboarding/connect");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Invalid Trial Link</h1>
            <p className="text-gray-500">This trial link is invalid. Please contact your sales representative for a new link.</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Trial Period Ended</h1>
            <p className="text-gray-500 mb-6">Your 30-day free trial has expired. Sign in to continue with a paid plan.</p>
            <a
              href="/signin"
              className="inline-block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-center"
            >
              Sign In
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (status === "active") {
    const handleRetry = async () => {
      setRetrying(true);
      setLoginError("");
      const success = await attemptAutoLogin();
      if (!success) {
        setLoginError("Auto-login failed. Please sign in manually.");
      }
      setRetrying(false);
    };

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            {retrying ? (
              <>
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Signing you in...</p>
              </>
            ) : (
              <>
                <h1 className="text-xl font-bold text-gray-900 mb-3">Trial Already Active</h1>
                {loginError && (
                  <p className="text-sm text-red-600 mb-4">{loginError}</p>
                )}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleRetry}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    Retry Sign In
                  </button>
                  <a
                    href="/signin"
                    className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors text-center"
                  >
                    Sign In Manually
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // status === "new" — show setup form
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Start Your 30-Day Free Trial</h1>
          <p className="text-gray-500 mt-2">Welcome, {clientName}! Set up your account to get started.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Account Info */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={clientEmail}
                    disabled
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Password *</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      required
                      minLength={8}
                    />
                    <p className="text-xs text-gray-400 mt-1">Min 8 chars, 1 uppercase, 1 lowercase, 1 number</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Confirm Password *</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      required
                      minLength={8}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Marketplace Selection */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Select 2 Marketplaces</h2>
              <p className="text-sm text-gray-500 mb-4">Choose 2 marketplaces to connect during your free trial ({selectedMarketplaces.length}/2 selected)</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {MARKETPLACES.map((mp) => {
                  const selected = selectedMarketplaces.includes(mp.id);
                  const disabled = !selected && selectedMarketplaces.length >= 2;
                  return (
                    <button
                      key={mp.id}
                      type="button"
                      onClick={() => toggleMarketplace(mp.id)}
                      disabled={disabled}
                      className={`flex flex-col items-center gap-2 p-2 sm:p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        selected
                          ? "border-blue-500 bg-blue-50"
                          : disabled
                          ? "border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      {mp.logo}
                      <span className="text-xs font-medium text-gray-700 text-center leading-tight">{mp.name}</span>
                      {selected && (
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={submitting || selectedMarketplaces.length !== 2}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Setting up your trial..." : "Start Free Trial"}
              </button>
              <p className="text-xs text-gray-400 text-center">
                Your trial lasts 30 days with full access. No credit card required.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
