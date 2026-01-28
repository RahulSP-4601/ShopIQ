"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MarketplaceType } from "@prisma/client";
import { MARKETPLACES } from "@/lib/marketplace/config";

interface Connection {
  id: string;
  marketplace: MarketplaceType;
  status: string;
}

export default function TrialConnectPage() {
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState<MarketplaceType | null>(null);
  const [error, setError] = useState("");
  const [isLoadingConnections, setIsLoadingConnections] = useState(true);
  const [showShopifyModal, setShowShopifyModal] = useState(false);
  const [shopifyDomain, setShopifyDomain] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);
  const shopifyInputRef = useRef<HTMLInputElement>(null);
  const connectButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showShopifyModal) return;
    setTimeout(() => shopifyInputRef.current?.focus(), 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowShopifyModal(false);
        setShopifyDomain("");
        connectButtonRef.current?.focus();
      }
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, input, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showShopifyModal]);

  const closeShopifyModal = useCallback(() => {
    setShowShopifyModal(false);
    setShopifyDomain("");
    connectButtonRef.current?.focus();
  }, []);

  const fetchConnections = useCallback(async () => {
    setError("");
    setIsLoadingConnections(true);
    try {
      const res = await fetch("/api/marketplaces");
      if (!res.ok) {
        setError("Failed to load connections. Please refresh.");
        return;
      }
      const data = await res.json();
      if (Array.isArray(data.connections)) {
        setConnections(data.connections);
      }
    } catch {
      setError("Failed to load connections.");
    } finally {
      setIsLoadingConnections(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // Only show marketplaces that the user has a connection record for (the 2 they selected)
  const trialMarketplaces = MARKETPLACES.filter((m) =>
    connections.some((c) => c.marketplace === m.id)
  );

  const isConnected = (marketplace: MarketplaceType) =>
    connections.some((c) => c.marketplace === marketplace && c.status === "CONNECTED");

  // Only count connections for marketplaces in the trial set
  const trialMarketplaceIds = new Set(trialMarketplaces.map((m) => m.id));
  const connectedCount = connections.filter(
    (c) => c.status === "CONNECTED" && trialMarketplaceIds.has(c.marketplace)
  ).length;
  const totalRequired = trialMarketplaces.length || 2;

  // Auto-redirect to /chat when all marketplaces are connected
  useEffect(() => {
    if (connectedCount > 0 && connectedCount >= totalRequired) {
      router.push("/chat");
    }
  }, [connectedCount, totalRequired, router]);

  const normalizeShopifyDomain = (input: string): string | null => {
    let domain = input.trim().toLowerCase();
    try {
      const urlString = domain.includes("://") ? domain : `https://${domain}`;
      const url = new URL(urlString);
      domain = url.hostname;
    } catch {
      domain = domain.replace(/^https?:\/\//, "");
      domain = domain.split("/")[0].split("?")[0].split("#")[0];
    }
    domain = domain.replace(/^\/+|\/+$/g, "").trim();

    // Valid store name: 1-63 chars, alphanumeric and hyphens only,
    // no leading/trailing hyphen, no consecutive hyphens
    const isValidStoreName = (name: string): boolean => {
      if (name.length < 1 || name.length > 63) return false;
      if (name.startsWith("-") || name.endsWith("-")) return false;
      if (name.includes("--")) return false;
      return /^[a-z0-9-]+$/.test(name);
    };

    if (domain.endsWith(".myshopify.com")) {
      const storeName = domain.slice(0, -".myshopify.com".length);
      if (!isValidStoreName(storeName)) return null;
      return domain;
    } else if (!domain.includes(".")) {
      if (!isValidStoreName(domain)) return null;
      return `${domain}.myshopify.com`;
    }
    return null;
  };

  const handleConnect = async (marketplace: MarketplaceType) => {
    if (marketplace === "SHOPIFY") {
      connectButtonRef.current = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null;
      setShowShopifyModal(true);
      return;
    }

    setLoading(marketplace);
    setError("");
    try {
      const res = await fetch("/api/marketplaces/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketplace }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to connect");
        return;
      }
      await fetchConnections();
    } catch {
      setError("Failed to connect marketplace");
    } finally {
      setLoading(null);
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
      const res = await fetch("/api/marketplaces/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketplace: "SHOPIFY", shopDomain: domain }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to connect");
        setLoading(null);
        return;
      }
      if (data.requiresOAuth && data.oauthUrl) {
        setShowShopifyModal(false);
        setShopifyDomain("");
        setLoading(null);
        window.location.href = data.oauthUrl;
        return;
      }
      setShowShopifyModal(false);
      setShopifyDomain("");
      setLoading(null);
      await fetchConnections();
    } catch {
      setError("Failed to connect to Shopify");
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-sm font-medium mb-4">
            30-Day Free Trial
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Connect Your Marketplaces
          </h1>
          <p className="mt-2 text-slate-600">
            Connect your {totalRequired} selected marketplaces to get started.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm text-center">
            {error}
          </div>
        )}

        {/* Progress */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-sm font-medium">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {connectedCount} of {totalRequired} connected
          </div>
        </div>

        {/* Marketplace cards */}
        <div className="grid grid-cols-1 gap-4 mb-8">
          {trialMarketplaces.map((marketplace) => {
            const connected = isConnected(marketplace.id);
            const isLoading = loading === marketplace.id;

            return (
              <div
                key={marketplace.id}
                className={`relative bg-white rounded-2xl border-2 p-5 flex items-center gap-4 transition-all ${
                  connected
                    ? "border-teal-500 shadow-lg shadow-teal-500/10"
                    : "border-slate-200 hover:border-slate-300 hover:shadow-md"
                }`}
              >
                {connected && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}

                <div className="flex-shrink-0">{marketplace.logo}</div>

                <div className="flex-1">
                  <p className="font-medium text-slate-900">{marketplace.name}</p>
                  <p className="text-sm text-slate-500">
                    {connected ? "Connected" : "Not connected"}
                  </p>
                </div>

                {!connected && (
                  <button
                    onClick={() => handleConnect(marketplace.id)}
                    disabled={isLoading}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm font-medium hover:from-teal-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isLoading ? (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      "Connect"
                    )}
                  </button>
                )}
              </div>
            );
          })}

          {/* Show loading state if connections haven't loaded yet */}
          {isLoadingConnections && connections.length === 0 && (
            <div className="text-center py-8 text-slate-400">Loading marketplaces...</div>
          )}
          {!isLoadingConnections && connections.length === 0 && (
            <div className="text-center py-8 text-slate-400">No marketplaces found.</div>
          )}
        </div>

        {/* Shopify Modal */}
        {showShopifyModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shopify-modal-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeShopifyModal();
            }}
          >
            <div ref={modalRef} className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#95BF47]/10 flex items-center justify-center">
                  <svg className="w-7 h-7" viewBox="0 0 109 124" fill="#95BF47">
                    <path d="M95.8 23.4c-.1-.6-.6-1-1.1-1-.5-.1-10.3-.8-10.3-.8s-6.8-6.7-7.5-7.5c-.7-.7-2.1-.5-2.6-.3-.1 0-1.4.4-3.6 1.1-2.1-6.2-5.9-11.8-12.6-11.8h-.6c-1.9-2.5-4.2-3.6-6.2-3.6-15.3 0-22.6 19.1-24.9 28.8-5.9 1.8-10.1 3.1-10.6 3.3-3.3 1-3.4 1.1-3.8 4.2-.3 2.3-9 69.3-9 69.3l67.5 12.7 36.5-7.9S95.9 24 95.8 23.4z" />
                  </svg>
                </div>
                <div>
                  <h3 id="shopify-modal-title" className="text-lg font-semibold text-slate-900">Connect Shopify</h3>
                  <p className="text-sm text-slate-500">Enter your store domain</p>
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="shopify-domain" className="block text-sm font-medium text-slate-700 mb-1.5">Store Domain</label>
                <div className="flex">
                  <input
                    ref={shopifyInputRef}
                    id="shopify-domain"
                    type="text"
                    value={shopifyDomain}
                    onChange={(e) => setShopifyDomain(e.target.value)}
                    placeholder="your-store"
                    className="flex-1 rounded-l-xl border border-r-0 border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !loading) handleShopifyConnect();
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
    </div>
  );
}
