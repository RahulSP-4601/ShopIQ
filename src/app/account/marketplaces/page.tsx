"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { MarketplaceType } from "@prisma/client";
import { PRICING, calculateMonthlyPrice } from "@/lib/subscription/pricing";
import { MARKETPLACES } from "@/lib/marketplace/config";

interface Connection {
  id: string;
  marketplace: MarketplaceType;
  status: string;
  externalName?: string;
  connectedAt?: string;
}

interface Subscription {
  id: string;
  status: string;
  totalPrice: string;
  marketplaceCount: number;
  currentPeriodEnd: string;
}

export default function AccountMarketplacesPage() {
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState<MarketplaceType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showShopifyModal, setShowShopifyModal] = useState(false);
  const [shopifyDomain, setShopifyDomain] = useState("");

  // Refs for modal accessibility
  const modalRef = useRef<HTMLDivElement>(null);
  const shopifyInputRef = useRef<HTMLInputElement>(null);
  const connectButtonRef = useRef<HTMLButtonElement>(null);

  // Ref to prevent concurrent subscription updates (race condition fix)
  const subscriptionUpdateInFlightRef = useRef<Promise<boolean> | null>(null);

  const fetchData = useCallback(async (): Promise<Connection[]> => {
    try {
      const [connectionsRes, subscriptionRes] = await Promise.all([
        fetch("/api/marketplaces"),
        fetch("/api/subscription"),
      ]);

      // Handle auth errors - redirect to signin
      if (connectionsRes.status === 401 || subscriptionRes.status === 401) {
        router.push("/signin");
        return [];
      }

      if (!connectionsRes.ok || !subscriptionRes.ok) {
        setError("Failed to load data. Please try again.");
        return [];
      }

      const connectionsData = await connectionsRes.json();
      const subscriptionData = await subscriptionRes.json();

      const newConnections = connectionsData.connections || [];
      setConnections(newConnections);

      if (subscriptionData.subscription) {
        setSubscription(subscriptionData.subscription);
      }

      return newConnections;
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to load data. Please try again.");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Modal keyboard accessibility
  useEffect(() => {
    if (!showShopifyModal) return;

    // Focus the input when modal opens
    setTimeout(() => {
      shopifyInputRef.current?.focus();
    }, 0);

    // Handle escape key to close modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowShopifyModal(false);
        setShopifyDomain("");
        // Return focus to the button that opened the modal
        connectButtonRef.current?.focus();
      }

      // Focus trap - cycle through focusable elements
      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showShopifyModal]);

  // Close modal and return focus
  const closeShopifyModal = useCallback(() => {
    setShowShopifyModal(false);
    setShopifyDomain("");
    // Return focus to the button that opened the modal
    connectButtonRef.current?.focus();
  }, []);

  const isConnected = (marketplace: MarketplaceType) => {
    return connections.some(
      (c) => c.marketplace === marketplace && c.status === "CONNECTED"
    );
  };

  const connectedCount = connections.filter(
    (c) => c.status === "CONNECTED"
  ).length;

  const handleConnect = async (marketplace: MarketplaceType) => {
    if (marketplace === "SHOPIFY") {
      // Store ref to button that opened modal for focus return
      connectButtonRef.current = document.activeElement as HTMLButtonElement;
      setShowShopifyModal(true);
      return;
    }

    setLoading(marketplace);
    setError("");

    try {
      const response = await fetch("/api/marketplaces/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketplace }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to connect");
        return;
      }

      // Handle OAuth redirect (for Flipkart and future OAuth marketplaces)
      if (data.requiresOAuth && data.oauthUrl) {
        window.location.href = data.oauthUrl;
        return;
      }

      // Refresh data and get authoritative count from server
      const refreshedConnections = await fetchData();
      const newCount = refreshedConnections.filter(
        (c) => c.status === "CONNECTED"
      ).length;

      // Update subscription with the actual count from server
      try {
        await updateSubscription(newCount);
      } catch (subscriptionError) {
        // Subscription update failed - show error but don't revert connection
        // since the marketplace connection itself succeeded
        setError(
          "Marketplace connected, but subscription update failed. Please refresh the page."
        );
        console.error("Subscription update error:", subscriptionError);
      }
    } catch {
      setError("Failed to connect marketplace");
    } finally {
      setLoading(null);
    }
  };

  // Normalize Shopify domain - handles URLs, paths, and plain store names
  // Returns null for invalid domains (non-myshopify.com TLDs or invalid characters)
  const normalizeShopifyDomain = (input: string): string | null => {
    let domain = input.trim().toLowerCase();

    // Try to parse as URL to extract hostname
    try {
      // Add protocol if missing to make URL parsing work
      const urlString = domain.includes("://") ? domain : `https://${domain}`;
      const url = new URL(urlString);
      domain = url.hostname;
    } catch {
      // If URL parsing fails, use regex to clean up the input
      // Remove protocol
      domain = domain.replace(/^https?:\/\//, "");
      // Remove paths, query strings, and fragments
      domain = domain.split("/")[0].split("?")[0].split("#")[0];
    }

    // Remove any trailing/leading slashes or whitespace
    domain = domain.replace(/^\/+|\/+$/g, "").trim();

    // Validate and normalize domain
    // Stricter regex: alphanumeric, no leading/trailing/consecutive hyphens
    const validStoreNameRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

    if (domain.endsWith(".myshopify.com")) {
      // Extract store name and validate characters
      const storeName = domain.slice(0, -".myshopify.com".length);
      if (!validStoreNameRegex.test(storeName) || storeName.length === 0) {
        return null; // Invalid store name (empty, leading/trailing/consecutive hyphens, or invalid chars)
      }
      return domain; // Valid myshopify domain
    } else if (!domain.includes(".")) {
      // Plain store name - validate characters
      if (!validStoreNameRegex.test(domain) || domain.length === 0) {
        return null; // Invalid store name (empty, leading/trailing/consecutive hyphens, or invalid chars)
      }
      return `${domain}.myshopify.com`; // Plain store name, append suffix
    } else {
      return null; // Invalid domain with non-myshopify TLD
    }
  };

  const handleShopifyConnect = async () => {
    if (!shopifyDomain.trim()) {
      setError("Please enter your Shopify store domain");
      return;
    }

    const domain = normalizeShopifyDomain(shopifyDomain);
    if (!domain) {
      setError("Please enter a valid Shopify store name or .myshopify.com domain");
      return;
    }

    setLoading("SHOPIFY");
    setError("");

    try {
      const response = await fetch("/api/marketplaces/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketplace: "SHOPIFY", shopDomain: domain }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to connect");
        setLoading(null);
        return;
      }

      if (data.requiresOAuth && data.oauthUrl) {
        // Reset loading state before redirect so UI doesn't stay in loading state
        // if user returns after a failed OAuth attempt
        setLoading(null);
        window.location.href = data.oauthUrl;
        return;
      }

      // Non-OAuth success case - connection completed without redirect
      // Close modal, clear state, and refresh data
      setShowShopifyModal(false);
      setShopifyDomain("");
      setError("");
      setLoading(null);

      // Refresh data and update subscription
      const refreshedConnections = await fetchData();
      const newCount = refreshedConnections.filter(
        (c) => c.status === "CONNECTED"
      ).length;

      try {
        await updateSubscription(newCount);
      } catch (subscriptionError) {
        setError(
          "Marketplace connected, but subscription update failed. Please refresh the page."
        );
        console.error("Subscription update error:", subscriptionError);
      }
    } catch {
      setError("Failed to connect to Shopify");
    } finally {
      setLoading(null);
    }
  };

  const handleDisconnect = async (marketplace: MarketplaceType) => {
    if (connectedCount <= 1) {
      setError("You must have at least 1 marketplace connected");
      return;
    }

    setLoading(marketplace);
    setError("");

    try {
      const response = await fetch("/api/marketplaces/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketplace }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to disconnect");
        return;
      }

      // Refresh data and get authoritative count from server
      const refreshedConnections = await fetchData();
      const newCount = refreshedConnections.filter(
        (c) => c.status === "CONNECTED"
      ).length;

      // Update subscription with the actual count from server
      try {
        await updateSubscription(newCount);
      } catch (subscriptionError) {
        // Subscription update failed - show error but don't revert disconnection
        // since the marketplace disconnection itself succeeded
        setError(
          "Marketplace disconnected, but subscription update failed. Please refresh the page."
        );
        console.error("Subscription update error:", subscriptionError);
      }
    } catch {
      setError("Failed to disconnect marketplace");
    } finally {
      setLoading(null);
    }
  };

  const updateSubscription = async (newCount: number): Promise<boolean> => {
    // Wait for any in-flight subscription update to complete first (race condition fix)
    if (subscriptionUpdateInFlightRef.current) {
      try {
        await subscriptionUpdateInFlightRef.current;
      } catch {
        // Previous update failed, continue with our update
      }
    }

    const updatePromise = (async () => {
      try {
        const response = await fetch("/api/subscription/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ marketplaceCount: newCount }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          const errorMessage = data.error || `Subscription update failed (${response.status})`;
          console.error("Failed to update subscription:", errorMessage);
          throw new Error(errorMessage);
        }

        return true;
      } catch (error) {
        console.error("Failed to update subscription:", error);
        throw error;
      } finally {
        subscriptionUpdateInFlightRef.current = null;
      }
    })();

    subscriptionUpdateInFlightRef.current = updatePromise;
    return updatePromise;
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-teal-100/40 to-emerald-100/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-gradient-to-tr from-blue-100/30 to-indigo-100/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-xl blur opacity-25 group-hover:opacity-40 transition-opacity" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg">
                <Image
                  src="/logo.png"
                  alt="Frame"
                  width={38}
                  height={38}
                  className="object-contain"
                />
              </div>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Frame
            </span>
          </Link>

          <Link
            href="/chat"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Chat
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Manage Marketplaces
          </h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-slate-600">
            Connect or disconnect your e-commerce platforms
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Marketplaces Grid */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  Your Marketplaces
                </h2>
                <span className="px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-sm font-medium">
                  {connectedCount} connected
                </span>
              </div>

              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                {MARKETPLACES.map((marketplace) => {
                  const connected = isConnected(marketplace.id);
                  const isCurrentLoading = loading === marketplace.id;

                  return (
                    <div
                      key={marketplace.id}
                      className={`relative bg-white rounded-xl border-2 p-4 transition-all duration-200 ${
                        connected
                          ? "border-teal-500 shadow-md"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {connected && (
                        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-teal-500 text-white flex items-center justify-center">
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}

                      <div className="flex justify-center mb-2">
                        {marketplace.logo}
                      </div>
                      <p className="text-sm font-medium text-slate-900 text-center mb-3">
                        {marketplace.name}
                      </p>

                      <button
                        onClick={() =>
                          connected
                            ? handleDisconnect(marketplace.id)
                            : handleConnect(marketplace.id)
                        }
                        disabled={isCurrentLoading}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                          connected
                            ? "bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600"
                            : "bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:from-teal-600 hover:to-emerald-600"
                        } disabled:opacity-50`}
                      >
                        {isCurrentLoading ? (
                          <svg
                            className="animate-spin h-4 w-4 mx-auto"
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
                        ) : connected ? (
                          "Disconnect"
                        ) : (
                          "Connect"
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Subscription Summary */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-4 sm:p-6 lg:sticky lg:top-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Subscription
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Status</span>
                  {subscription ? (
                    <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                      {subscription.status}
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">
                      No subscription
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Marketplaces</span>
                  <span className="font-medium text-slate-900">
                    {connectedCount}
                  </span>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-600">Base plan ({PRICING.INCLUDED_MARKETPLACES} marketplaces)</span>
                    <span className="text-slate-900">
                      {PRICING.CURRENCY_SYMBOL}{PRICING.BASE_PRICE}
                    </span>
                  </div>
                  {connectedCount > PRICING.INCLUDED_MARKETPLACES && (
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-600">
                        +{connectedCount - PRICING.INCLUDED_MARKETPLACES} additional
                      </span>
                      <span className="text-slate-900">
                        {PRICING.CURRENCY_SYMBOL}
                        {(connectedCount - PRICING.INCLUDED_MARKETPLACES) * PRICING.ADDITIONAL_PRICE}
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">
                      Monthly Total
                    </span>
                    <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-500">
                      {PRICING.CURRENCY_SYMBOL}{calculateMonthlyPrice(connectedCount)}
                    </span>
                  </div>
                </div>

                {subscription?.currentPeriodEnd && (
                  <p className="text-xs text-slate-500">
                    Next billing:{" "}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Shopify Modal */}
      {showShopifyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shopify-modal-title"
          onClick={(e) => {
            // Close when clicking backdrop
            if (e.target === e.currentTarget) closeShopifyModal();
          }}
        >
          <div
            ref={modalRef}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#95BF47]/10 flex items-center justify-center">
                <svg className="w-7 h-7" viewBox="0 0 109 124" fill="#95BF47">
                  <path d="M95.8 23.4c-.1-.6-.6-1-1.1-1-.5-.1-10.3-.8-10.3-.8s-6.8-6.7-7.5-7.5c-.7-.7-2.1-.5-2.6-.3-.1 0-1.4.4-3.6 1.1-2.1-6.2-5.9-11.8-12.6-11.8h-.6c-1.9-2.5-4.2-3.6-6.2-3.6-15.3 0-22.6 19.1-24.9 28.8-5.9 1.8-10.1 3.1-10.6 3.3-3.3 1-3.4 1.1-3.8 4.2-.3 2.3-9 69.3-9 69.3l67.5 12.7 36.5-7.9S95.9 24 95.8 23.4z" />
                </svg>
              </div>
              <div>
                <h3
                  id="shopify-modal-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  Connect Shopify
                </h3>
                <p className="text-sm text-slate-500">Enter your store domain</p>
              </div>
            </div>

            <div className="mb-4">
              <label
                htmlFor="shopify-domain-input"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Store Domain
              </label>
              <div className="flex">
                <input
                  ref={shopifyInputRef}
                  id="shopify-domain-input"
                  type="text"
                  value={shopifyDomain}
                  onChange={(e) => setShopifyDomain(e.target.value)}
                  placeholder="your-store"
                  className="flex-1 rounded-l-xl border border-r-0 border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !loading) {
                      handleShopifyConnect();
                    }
                  }}
                />
                <div className="flex items-center px-4 bg-slate-100 border border-l-0 border-slate-200 rounded-r-xl text-sm text-slate-500">
                  .myshopify.com
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeShopifyModal}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleShopifyConnect}
                disabled={loading === "SHOPIFY"}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium hover:from-teal-600 hover:to-emerald-600 transition-colors disabled:opacity-50"
              >
                {loading === "SHOPIFY" ? "Connecting..." : "Connect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
