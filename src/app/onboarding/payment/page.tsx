"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PRICING, calculateMonthlyPrice } from "@/lib/subscription/pricing";
import { MARKETPLACE_NAMES } from "@/lib/marketplace/config";
import { MarketplaceType } from "@prisma/client";

interface Connection {
  id: string;
  marketplace: MarketplaceType;
  status: string;
  externalName?: string;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

export default function OnboardingPaymentPage() {
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const mountedRef = useRef(true);

  // Track component mount state for async callbacks
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Load Razorpay Checkout.js script
  useEffect(() => {
    const onLoad = (e: Event) => {
      const el = e.target as HTMLScriptElement | null;
      if (el) el.dataset.errored = "false";
      if (mountedRef.current) setRazorpayLoaded(true);
    };
    const onError = (e: Event) => {
      const el = e.target as HTMLScriptElement | null;
      if (el) el.dataset.errored = "true";
      if (mountedRef.current) setError("Failed to load payment gateway. Please refresh the page.");
    };

    // Already loaded and available on window
    if (typeof window !== "undefined" && window.Razorpay) {
      setRazorpayLoaded(true);
      return;
    }

    // Script element exists — check if it previously failed
    let existingScript = document.getElementById("razorpay-script") as HTMLScriptElement | null;
    if (existingScript) {
      if (existingScript.dataset.errored === "true") {
        // Prior load failed — remove stale element so we can create a fresh one below
        existingScript.remove();
        existingScript = null;
      } else {
        // Attach listeners FIRST to avoid the race where window.Razorpay becomes
        // available between our check and addEventListener calls.
        existingScript.addEventListener("load", onLoad);
        existingScript.addEventListener("error", onError);
        // Re-check: if Razorpay loaded between the outer check and listener attach,
        // the load event already fired and won't re-fire — handle it synchronously.
        if (window.Razorpay) {
          setRazorpayLoaded(true);
        }
        return () => {
          existingScript!.removeEventListener("load", onLoad);
          existingScript!.removeEventListener("error", onError);
        };
      }
    }

    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.errored = "false";
    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);
    document.body.appendChild(script);

    return () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
    };
  }, []);

  useEffect(() => {
    fetchConnections();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

      if (!data.connections || !Array.isArray(data.connections)) {
        console.error("Invalid connections data received:", data);
        setError("Invalid data received. Please refresh the page.");
        return;
      }

      const connected = data.connections.filter(
        (c: Connection) => c.status === "CONNECTED"
      );
      setConnections(connected);

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
  const additionalCount = Math.max(0, connectedCount - PRICING.INCLUDED_MARKETPLACES);
  const additionalPrice = additionalCount * PRICING.ADDITIONAL_PRICE;
  const totalPricePaise = calculateMonthlyPrice(connectedCount);
  const totalPriceDisplay = Math.round(totalPricePaise / 100);

  const handlePayment = async () => {
    if (!razorpayLoaded) {
      setError("Payment gateway is still loading. Please wait.");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      // Step 1: Create Razorpay subscription on server
      const checkoutRes = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketplaceCount: connectedCount }),
      });

      if (!checkoutRes.ok) {
        const errData = await checkoutRes.json().catch(() => ({}));
        setError(errData.error || "Failed to create subscription");
        setIsProcessing(false);
        return;
      }

      const checkoutData = await checkoutRes.json();

      // Validate required fields before initializing Razorpay
      if (!checkoutData?.razorpayKeyId || !checkoutData?.subscriptionId) {
        console.error(
          "Checkout response missing required fields:",
          { razorpayKeyId: checkoutData?.razorpayKeyId, subscriptionId: checkoutData?.subscriptionId }
        );
        setError("Invalid checkout response. Please try again.");
        setIsProcessing(false);
        return;
      }

      // Step 2: Open Razorpay Checkout modal
      const options = {
        key: checkoutData.razorpayKeyId,
        subscription_id: checkoutData.subscriptionId,
        name: "Frame",
        description: `Frame Pro - ${connectedCount} marketplace${connectedCount > 1 ? "s" : ""}`,
        image: "/logo.png",
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_subscription_id: string;
          razorpay_signature: string;
        }) => {
          // Step 3: Verify payment on server
          try {
            const verifyRes = await fetch("/api/subscription/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });

            if (!mountedRef.current) return;

            if (!verifyRes.ok) {
              const errData = await verifyRes.json().catch(() => ({}));
              if (mountedRef.current) {
                setError(errData.error || "Payment verification failed");
                setIsProcessing(false);
              }
              return;
            }

            const verifyData = await verifyRes.json();

            // Success — redirect to chat
            if (mountedRef.current) {
              if (verifyData.redirect) {
                router.push(verifyData.redirect);
              } else {
                router.push("/chat?checkout=success");
              }
            }
          } catch (err) {
            console.error("Payment verification error:", err);
            if (mountedRef.current) {
              setError("Payment verification failed. Please contact support.");
              setIsProcessing(false);
            }
          }
        },
        prefill: {
          name: checkoutData.name,
          email: checkoutData.email,
        },
        theme: {
          color: "#14B8A6", // teal-500 — matches Frame branding
        },
        modal: {
          ondismiss: () => {
            if (mountedRef.current) setIsProcessing(false);
          },
          confirm_close: true,
        },
        notes: {
          marketplaceCount: String(connectedCount),
        },
      };

      if (!window.Razorpay) {
        console.error("window.Razorpay is not available despite razorpayLoaded=true");
        setError("Payment gateway failed to initialize. Please refresh the page.");
        setIsProcessing(false);
        return;
      }

      try {
        const rzp = new window.Razorpay(options);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rzp.on("payment.failed", (response: any) => {
          if (!mountedRef.current) return;
          setError(
            response.error?.description || "Payment failed. Please try again."
          );
          setIsProcessing(false);
        });
        rzp.open();
      } catch (rzpError) {
        console.error("Razorpay initialization/open failed:", rzpError);
        if (!mountedRef.current) return;
        setError("Payment initiation failed. Please try again or contact support.");
        setIsProcessing(false);
        return;
      }
    } catch (error) {
      console.error("Payment error:", error);
      setError("Failed to initiate payment. Please try again.");
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
          <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-sm font-semibold">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <span className="text-sm font-medium text-teal-600">
            Marketplaces
          </span>
        </div>
        <div className="w-12 h-0.5 bg-teal-400" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-sm font-semibold">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <span className="text-sm font-medium text-teal-600">Your Business</span>
        </div>
        <div className="w-12 h-0.5 bg-teal-400" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white flex items-center justify-center text-sm font-semibold">
            3
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
          Review your plan and complete payment
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
                  {index < PRICING.INCLUDED_MARKETPLACES ? "Included" : `+${PRICING.CURRENCY_SYMBOL}${PRICING.ADDITIONAL_PRICE}`}
                </span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200 pt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Base plan ({PRICING.INCLUDED_MARKETPLACES} marketplaces)</span>
              <span className="text-slate-900 font-medium">
                {PRICING.CURRENCY_SYMBOL}{PRICING.BASE_PRICE}
              </span>
            </div>
            {additionalCount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">
                  Additional ({additionalCount} marketplace
                  {additionalCount > 1 ? "s" : ""})
                </span>
                <span className="text-slate-900 font-medium">
                  {PRICING.CURRENCY_SYMBOL}{additionalPrice}
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
                {PRICING.CURRENCY_SYMBOL}{totalPriceDisplay}
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

        {/* Payment Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Payment
          </h2>

          <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <svg className="w-6 h-6 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span className="text-sm font-medium text-slate-700">Secure payment via Razorpay</span>
            </div>
            <p className="text-xs text-slate-500">
              Pay using UPI, Credit/Debit Cards, Netbanking, or Wallets.
              Your payment details are processed securely by Razorpay.
            </p>
          </div>

          {/* Pay Button */}
          <button
            onClick={handlePayment}
            disabled={isProcessing || !razorpayLoaded}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-teal-500/25 hover:from-teal-600 hover:to-emerald-600 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
                <span>Pay {PRICING.CURRENCY_SYMBOL}{totalPriceDisplay}/mo</span>
              </>
            )}
          </button>

          {/* Payment methods */}
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span>SSL Secured</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 mt-3 text-xs text-slate-400">
            <span>UPI</span>
            <span className="text-slate-300">|</span>
            <span>Cards</span>
            <span className="text-slate-300">|</span>
            <span>Netbanking</span>
            <span className="text-slate-300">|</span>
            <span>Wallets</span>
          </div>
        </div>
      </div>
    </div>
  );
}
