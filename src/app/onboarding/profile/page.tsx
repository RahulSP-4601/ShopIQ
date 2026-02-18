"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const INDUSTRIES = [
  { id: "FASHION", label: "Fashion & Apparel", icon: "👗" },
  { id: "ELECTRONICS", label: "Electronics", icon: "📱" },
  { id: "HOME_GARDEN", label: "Home & Garden", icon: "🏡" },
  { id: "FOOD_BEVERAGE", label: "Food & Beverage", icon: "🍽️" },
  { id: "HEALTH_BEAUTY", label: "Health & Beauty", icon: "💄" },
  { id: "SPORTS_OUTDOOR", label: "Sports & Outdoor", icon: "⚽" },
  { id: "TOYS_GAMES", label: "Toys & Games", icon: "🎮" },
  { id: "BOOKS_MEDIA", label: "Books & Media", icon: "📚" },
  { id: "AUTOMOTIVE", label: "Automotive", icon: "🚗" },
  { id: "JEWELRY", label: "Jewelry & Accessories", icon: "💎" },
  { id: "HANDMADE_CRAFT", label: "Handmade & Craft", icon: "🎨" },
  { id: "PET_SUPPLIES", label: "Pet Supplies", icon: "🐾" },
  { id: "OTHER", label: "Other", icon: "🛒" },
] as const;

const BUSINESS_SIZES = [
  { id: "SOLO", label: "Solo", description: "Just me" },
  { id: "SMALL", label: "Small", description: "2–10 people" },
  { id: "MEDIUM", label: "Medium", description: "11–50 people" },
  { id: "LARGE", label: "Large", description: "51+ people" },
] as const;

export default function OnboardingProfilePage() {
  const router = useRouter();
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [primaryCategory, setPrimaryCategory] = useState("");
  const [targetMarket, setTargetMarket] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleContinue = async () => {
    if (!selectedIndustry) {
      setError("Please select your industry");
      return;
    }
    if (!selectedSize) {
      setError("Please select your business size");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/onboarding/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: selectedIndustry,
          businessSize: selectedSize,
          primaryCategory: primaryCategory.trim() || null,
          targetMarket: targetMarket.trim() || null,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to save profile";
        try {
          // Read body once as text, then try to parse as JSON
          const raw = await response.text();
          try {
            const data = JSON.parse(raw);
            errorMessage = data.error || errorMessage;
          } catch (parseErr) {
            console.debug("Profile save error - JSON parse failed:", parseErr instanceof Error ? parseErr.message : parseErr);
            // Not valid JSON, sanitize raw text before showing to user
            // Strip HTML tags, stack traces, and file paths
            let sanitized = raw
              .replace(/<[^>]*>/g, "") // Remove HTML tags
              .replace(/\s+at\s+.*?\(.*?\)/g, "") // Remove stack trace lines
              .replace(/\s+at\s+.*/g, "") // Remove other stack trace formats
              .replace(/\/[\w\-./]+:\d+:\d+/g, "") // Remove file paths with line numbers
              .trim();

            // Truncate very long messages and use generic fallback for suspicious content
            if (sanitized.length > 200 || sanitized.includes("Error:") || sanitized.includes("Exception")) {
              errorMessage = "Failed to save profile";
            } else {
              errorMessage = sanitized || errorMessage;
            }
          }
        } catch (bodyReadErr) {
          console.debug("Profile save error - failed to read response body:", bodyReadErr instanceof Error ? bodyReadErr.message : bodyReadErr);
          // Failed to read body, use default error message
        }
        setError(errorMessage);
        return;
      }

      router.push("/onboarding/payment");
    } catch (err) {
      console.error("Profile save error:", err);
      setError("Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (loading) return;
    router.push("/onboarding/payment");
  };

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
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white flex items-center justify-center text-sm font-semibold">
            2
          </div>
          <span className="text-sm font-medium text-slate-900">
            Your Business
          </span>
        </div>
        <div className="w-12 h-0.5 bg-slate-200" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-semibold">
            3
          </div>
          <span className="text-sm font-medium text-slate-400">Payment</span>
        </div>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
          Tell Us About Your Business
        </h1>
        <p className="mt-3 text-lg text-slate-600">
          This helps Frax understand your industry and provide better insights
          from day one.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div role="alert" className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm text-center">
          {error}
        </div>
      )}

      {/* Industry Selection */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          What industry are you in?
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {INDUSTRIES.map((industry) => (
            <button
              key={industry.id}
              disabled={loading}
              onClick={() => {
                if (loading) return;
                setSelectedIndustry(industry.id);
                setError("");
              }}
              aria-pressed={selectedIndustry === industry.id}
              className={`relative bg-white rounded-2xl border-2 p-4 transition-all duration-200 text-left focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 outline-none ${
                selectedIndustry === industry.id
                  ? "border-teal-500 shadow-lg shadow-teal-500/10"
                  : "border-slate-200 hover:border-slate-300 hover:shadow-md"
              }`}
            >
              {selectedIndustry === industry.id && (
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center">
                  <svg
                    className="w-4 h-4"
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
              <div className="text-2xl mb-2">{industry.icon}</div>
              <p className="text-sm font-medium text-slate-900">
                {industry.label}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Business Size */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          How big is your team?
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {BUSINESS_SIZES.map((size) => (
            <button
              key={size.id}
              disabled={loading}
              onClick={() => {
                if (loading) return;
                setSelectedSize(size.id);
                setError("");
              }}
              aria-pressed={selectedSize === size.id}
              className={`bg-white rounded-2xl border-2 p-4 transition-all duration-200 text-center focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 outline-none ${
                selectedSize === size.id
                  ? "border-teal-500 shadow-lg shadow-teal-500/10"
                  : "border-slate-200 hover:border-slate-300 hover:shadow-md"
              }`}
            >
              <p className="text-sm font-semibold text-slate-900">
                {size.label}
              </p>
              <p className="text-xs text-slate-500 mt-1">{size.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Optional Fields */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="primary-category"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Primary Product Category{" "}
            <span className="text-slate-400">(optional)</span>
          </label>
          <input
            id="primary-category"
            type="text"
            value={primaryCategory}
            onChange={(e) => setPrimaryCategory(e.target.value)}
            disabled={loading}
            placeholder="e.g., Women's Clothing, Organic Snacks"
            maxLength={100}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        <div>
          <label
            htmlFor="target-market"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Target Market{" "}
            <span className="text-slate-400">(optional)</span>
          </label>
          <input
            id="target-market"
            type="text"
            value={targetMarket}
            onChange={(e) => setTargetMarket(e.target.value)}
            disabled={loading}
            placeholder="e.g., India, US & Canada, Global"
            maxLength={100}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handleSkip}
          disabled={loading}
          className={`px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 outline-none ${
            loading ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50"
          }`}
        >
          Skip for now
        </button>
        <button
          onClick={handleContinue}
          disabled={loading}
          aria-busy={loading}
          className="flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold text-lg shadow-lg shadow-teal-500/25 hover:from-teal-600 hover:to-emerald-600 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 outline-none"
        >
          <span>{loading ? "Saving..." : "Continue to Payment"}</span>
          {!loading && (
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
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
