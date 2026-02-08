"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MarketplaceType } from "@prisma/client";
import { MARKETPLACES } from "@/lib/marketplace/config";

interface Connection {
  id: string;
  marketplace: MarketplaceType;
  status: string;
  externalName?: string;
}

export default function OnboardingConnectPage() {
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState<MarketplaceType | null>(null);
  const [error, setError] = useState("");
  const [showShopifyModal, setShowShopifyModal] = useState(false);
  const [shopifyDomain, setShopifyDomain] = useState("");

  // Refs for modal accessibility
  const modalRef = useRef<HTMLDivElement>(null);
  const shopifyInputRef = useRef<HTMLInputElement>(null);
  const connectButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fetchConnections();
  }, []);

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

  const fetchConnections = async () => {
    try {
      const response = await fetch("/api/marketplaces");

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.error(
          `Failed to fetch connections: ${response.status} ${response.statusText}`,
          errorText
        );
        setError("Failed to load marketplace connections. Please refresh the page.");
        return;
      }

      const data = await response.json();
      if (Array.isArray(data.connections)) {
        setConnections(data.connections);
      }
    } catch (error) {
      console.error("Failed to fetch connections:", error);
      setError("Failed to load marketplace connections. Please try again.");
    }
  };

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

      // Handle OAuth redirect
      if (data.requiresOAuth && data.oauthUrl) {
        window.location.href = data.oauthUrl;
        return;
      }

      await fetchConnections();
    } catch (error) {
      console.error("Failed to connect marketplace:", error);
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
    if (domain.endsWith(".myshopify.com")) {
      // Extract store name and validate characters
      const storeName = domain.slice(0, -".myshopify.com".length);
      if (!/^[a-z0-9-]+$/.test(storeName) || storeName.length === 0) {
        return null; // Invalid characters in store name
      }
      return domain; // Valid myshopify domain
    } else if (!domain.includes(".")) {
      // Plain store name - validate characters
      if (!/^[a-z0-9-]+$/.test(domain) || domain.length === 0) {
        return null; // Invalid characters in store name
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

    setLoading("SHOPIFY");
    setError("");

    try {
      const domain = normalizeShopifyDomain(shopifyDomain);
      if (!domain) {
        setError("Please enter a valid Shopify store name or .myshopify.com domain");
        setLoading(null);
        return;
      }

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
        // Close modal and reset state before redirecting
        setShowShopifyModal(false);
        setShopifyDomain("");
        setLoading(null); // Reset loading before redirect
        window.location.href = data.oauthUrl;
        return;
      }

      // Non-OAuth success case - close modal and refresh connections
      setShowShopifyModal(false);
      setShopifyDomain("");
      setError("");
      setLoading(null);
      await fetchConnections();
    } catch (error) {
      console.error("Failed to connect to Shopify:", error);
      setError("Failed to connect to Shopify");
      setLoading(null);
    }
  };

  const handleDisconnect = async (marketplace: MarketplaceType) => {
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

      await fetchConnections();
    } catch (error) {
      console.error("Failed to disconnect marketplace:", error);
      setError("Failed to disconnect marketplace");
    } finally {
      setLoading(null);
    }
  };

  const handleContinue = () => {
    if (connectedCount < 1) {
      setError("Please connect at least 1 marketplace to continue");
      return;
    }
    router.push("/onboarding/payment");
  };

  return (
    <div className="w-full max-w-4xl">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white flex items-center justify-center text-sm font-semibold">
            1
          </div>
          <span className="text-sm font-medium text-slate-900">
            Connect Marketplaces
          </span>
        </div>
        <div className="w-12 h-0.5 bg-slate-200" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-semibold">
            2
          </div>
          <span className="text-sm font-medium text-slate-400">Payment</span>
        </div>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
          Connect Your Marketplaces
        </h1>
        <p className="mt-3 text-lg text-slate-600">
          Select the platforms you sell on. Connect at least 1 to continue.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm text-center">
          {error}
        </div>
      )}

      {/* Connected count badge */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-sm font-medium">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          {connectedCount} of {MARKETPLACES.length} marketplaces connected
        </div>
      </div>

      {/* Marketplace Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {MARKETPLACES.map((marketplace) => {
          const connected = isConnected(marketplace.id);
          const isLoading = loading === marketplace.id;

          return (
            <div
              key={marketplace.id}
              className={`relative bg-white rounded-2xl border-2 p-4 transition-all duration-200 ${
                connected
                  ? "border-teal-500 shadow-lg shadow-teal-500/10"
                  : "border-slate-200 hover:border-slate-300 hover:shadow-md"
              }`}
            >
              {/* Connected badge */}
              {connected && (
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}

              {/* Logo */}
              <div className="flex justify-center mb-3">{marketplace.logo}</div>

              {/* Name */}
              <p className="text-sm font-medium text-slate-900 text-center mb-3">
                {marketplace.name}
              </p>

              {/* Button */}
              <button
                onClick={() =>
                  connected
                    ? handleDisconnect(marketplace.id)
                    : handleConnect(marketplace.id)
                }
                disabled={isLoading}
                className={`w-full py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                  connected
                    ? "bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600"
                    : "bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:from-teal-600 hover:to-emerald-600"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoading ? (
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

      {/* Continue Button */}
      <div className="flex justify-center">
        <button
          onClick={handleContinue}
          disabled={connectedCount < 1}
          className="flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold text-lg shadow-lg shadow-teal-500/25 hover:from-teal-600 hover:to-emerald-600 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <span>Continue to Payment</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </button>
      </div>

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
