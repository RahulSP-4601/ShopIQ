"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ConnectPage() {
  const [shopDomain, setShopDomain] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    let domain = shopDomain.trim().toLowerCase();

    // Add .myshopify.com if not present
    if (!domain.includes(".myshopify.com")) {
      domain = `${domain}.myshopify.com`;
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
    if (!domainRegex.test(domain)) {
      setError("Please enter a valid Shopify store domain");
      return;
    }

    setIsLoading(true);

    // Redirect to OAuth flow
    router.push(`/api/auth/shopify?shop=${encodeURIComponent(domain)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-lg shadow-lg shadow-emerald-500/25">
              S
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Frame
            </span>
          </a>
        </div>

        {/* Connect Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-8">
          <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
            Connect your store
          </h1>
          <p className="text-slate-500 text-center mb-8">
            Enter your Shopify store domain to get started
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="shop"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Store domain
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="shop"
                  value={shopDomain}
                  onChange={(e) => setShopDomain(e.target.value)}
                  placeholder="your-store"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-32 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  disabled={isLoading}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  .myshopify.com
                </span>
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !shopDomain.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-600 hover:to-teal-700 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Connecting...
                </>
              ) : (
                <>
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M15.337 23.979l2.628-17.744-4.142.949-.837 5.622s-1.073-.555-2.396-.44c-1.94.17-1.963 1.34-1.946 1.646.09 1.605 4.27 1.954 4.503 5.692.182 2.94-1.56 4.95-4.067 5.107-3.013.19-4.674-1.588-4.674-1.588l.64-2.72s1.667 1.254 3 1.167c.87-.057 1.18-.762 1.148-1.264-.117-2.094-3.53-1.97-3.75-5.384-.185-2.87 1.703-5.778 5.858-6.042 1.613-.102 2.435.309 2.435.309l1.2-4.79s-1.123-.48-3.05-.387C6.7 4.286 4.5 7.77 4.5 11.5c0 6.35 4.39 9.676 4.39 9.676l-.86 3.3s2.058.75 4.53.533c2.932-.258 5.28-1.68 6.777-5.03z" />
                  </svg>
                  Connect with Shopify
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            By connecting, you agree to let Frame access your store data for
            analytics purposes.
          </p>
        </div>

        {/* Back link */}
        <p className="mt-6 text-center">
          <a
            href="/chat"
            className="text-sm text-slate-500 hover:text-emerald-600 transition-colors"
          >
            ← Back to chat
          </a>
        </p>
      </div>
    </div>
  );
}
