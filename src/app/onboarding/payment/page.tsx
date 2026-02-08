"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PRICING } from "@/lib/subscription/pricing";
import { MARKETPLACE_NAMES } from "@/lib/marketplace/config";
import { MarketplaceType } from "@prisma/client";

interface Connection {
  id: string;
  marketplace: MarketplaceType;
  status: string;
  externalName?: string;
}

// Centralized demo mode check
const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export default function OnboardingPaymentPage() {
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  // Dummy card state
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const response = await fetch("/api/marketplaces");

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.error(
          `Failed to fetch connections: ${response.status} ${response.statusText}`,
          errorText
        );
        setError("Failed to load marketplace data. Please refresh the page.");
        return;
      }

      const data = await response.json();

      // Guard against missing or invalid data
      if (!data.connections || !Array.isArray(data.connections)) {
        console.error("Invalid connections data received:", data);
        setError("Invalid data received. Please refresh the page.");
        return;
      }

      const connected = data.connections.filter(
        (c: Connection) => c.status === "CONNECTED"
      );
      setConnections(connected);

      // If no connections, redirect back
      if (connected.length === 0) {
        router.push("/onboarding/connect");
      }
    } catch (error) {
      console.error("Failed to fetch connections:", error);
      setError("Failed to load marketplace data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const connectedCount = connections.length;
  const additionalCount = Math.max(0, connectedCount - 1);
  const additionalPrice = additionalCount * PRICING.ADDITIONAL_PRICE;
  const totalPrice = PRICING.BASE_PRICE + additionalPrice;

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    // Return cleaned numeric string (or formatted parts) instead of raw input
    return parts.length ? parts.join(" ") : v;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!cardNumber || !expiry || !cvv || !cardName) {
      setError("Please fill in all card details");
      return;
    }

    setIsProcessing(true);
    setError("");

    if (isDemo) {
      // DEMO MODE: No real payment is processed.
      // Card details are NOT sent to any payment processor or stored.
      // This creates a DB-only subscription record.
      console.warn(
        "[DEMO] Payment not integrated — subscription created in DB only, no charge"
      );
      // Simulate processing delay for UX
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } else {
      // TODO: Replace with real Stripe integration before production launch.
      setError("Payment integration not available — this feature is coming soon.");
      setIsProcessing(false);
      return;
    }

    try {
      // Create subscription
      const response = await fetch("/api/subscription/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketplaceCount: connectedCount }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Payment failed");
        setIsProcessing(false);
        return;
      }

      // Reset processing state before navigation
      setIsProcessing(false);

      // Redirect to chat
      router.push("/chat");
    } catch (error) {
      console.error("Payment failed:", error);
      setError("Payment failed. Please try again.");
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg
          className="animate-spin h-10 w-10 text-teal-500"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center text-sm font-semibold">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <span className="text-sm font-medium text-slate-500">
            Marketplaces
          </span>
        </div>
        <div className="w-12 h-0.5 bg-teal-500" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white flex items-center justify-center text-sm font-semibold">
            2
          </div>
          <span className="text-sm font-medium text-slate-900">Payment</span>
        </div>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
          Complete Your Setup
        </h1>
        <p className="mt-3 text-lg text-slate-600">
          Review your plan and enter payment details
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm text-center">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Order Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Order Summary
          </h2>

          {/* Connected marketplaces */}
          <div className="space-y-3 mb-6">
            {connections.map((conn, index) => (
              <div
                key={conn.id}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 font-semibold text-sm">
                    {index + 1}
                  </div>
                  <span className="text-slate-700">
                    {MARKETPLACE_NAMES[conn.marketplace] || conn.marketplace}
                  </span>
                </div>
                <span className="text-slate-500 text-sm">
                  {index === 0 ? "Included" : `+$${PRICING.ADDITIONAL_PRICE}`}
                </span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200 pt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Base plan (1 marketplace)</span>
              <span className="text-slate-900 font-medium">
                ${PRICING.BASE_PRICE.toFixed(2)}
              </span>
            </div>
            {additionalCount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">
                  Additional ({additionalCount} marketplace
                  {additionalCount > 1 ? "s" : ""})
                </span>
                <span className="text-slate-900 font-medium">
                  ${additionalPrice.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Total */}
          <div className="border-t border-slate-200 mt-4 pt-4">
            <div className="flex justify-between">
              <span className="text-lg font-semibold text-slate-900">
                Total per month
              </span>
              <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-500">
                ${totalPrice.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Billed monthly. Cancel anytime.
            </p>
          </div>

          {/* Edit link */}
          <Link
            href="/onboarding/connect"
            className="mt-4 inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
            Edit marketplaces
          </Link>
        </div>

        {/* Payment Form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Payment Details
            </h2>
            {isDemo && (
              <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                Demo Mode
              </span>
            )}
          </div>

          {/* Demo mode notice */}
          {isDemo && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs">
              This is a demo. Card details are not processed or stored. Enter any
              test values to continue.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Card Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Name on Card
              </label>
              <input
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="John Doe"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            {/* Card Number */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Card Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) =>
                    setCardNumber(formatCardNumber(e.target.value))
                  }
                  placeholder="4242 4242 4242 4242"
                  maxLength={19}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                  <svg className="w-8 h-5" viewBox="0 0 32 20" fill="none">
                    <rect width="32" height="20" rx="3" fill="#1A1F71" />
                    <path fill="#F7B600" d="M13 14l2-8h2l-2 8h-2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Expiry and CVV */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Expiry Date
                </label>
                <input
                  type="text"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  placeholder="MM/YY"
                  maxLength={5}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  CVV
                </label>
                <input
                  type="text"
                  value={cvv}
                  onChange={(e) =>
                    setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  placeholder="123"
                  maxLength={4}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 mt-6 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-teal-500/25 hover:from-teal-600 hover:to-emerald-600 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isProcessing ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <span>Start Subscription - ${totalPrice.toFixed(2)}/mo</span>
                </>
              )}
            </button>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <span>SSL Secured</span>
              </div>
              {isDemo && (
                <div className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>Demo Mode</span>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
