// src/lib/ai/channel-fit/priors.ts
// Static marketplace knowledge — fallback when cross-tenant data is insufficient
// avgFeeRate = estimated total per-transaction cost (platform fee + payment processing)
// priceRange.sweet = [min, max] calibrated for the Indian market (INR) unless otherwise noted.
// Global platforms (Shopify, eBay, Etsy, etc.) support multiple currencies — the currency
// field is only set on region-locked marketplaces (e.g., Flipkart = INR-only).

import { MarketplacePrior } from "./types";

/**
 * Fallback display names for marketplaces not in MARKETPLACE_PRIORS.
 * Used by getMarketplaceDisplayName when a marketplace has been removed
 * from priors (e.g., Square — not available in India).
 */
const DISPLAY_NAMES: Record<string, string> = {
  SQUARE: "Square",
};

export const MARKETPLACE_PRIORS: Record<string, MarketplacePrior> = {
  SHOPIFY: {
    displayName: "Shopify",
    strengths: [
      "branded", "dtc", "niche", "apparel", "clothing", "fashion",
      "beauty", "cosmetics", "skincare", "supplement", "health",
      "jewelry", "accessories", "home", "decor", "food", "beverage",
    ],
    avgFeeRate: 0.049, // ~2% Shopify transaction fee (Basic plan) + ~2–3% Indian payment gateway (Razorpay/Cashfree); excludes GST
    bestFor: "branded D2C products, apparel, beauty, and lifestyle goods",
    priceRange: { sweet: [500, 10000] },
  },
  EBAY: {
    displayName: "eBay",
    strengths: [
      "electronics", "tech", "gadget", "cable", "charger", "adapter",
      "phone", "mobile", "laptop", "computer", "camera", "speaker",
      "headphone", "earphone", "audio", "gaming", "console",
      "collectibles", "vintage", "parts", "auto", "refurbished",
      "tools", "hardware", "accessories", "watch",
    ],
    avgFeeRate: 0.145, // ~13-15% final value fee (includes payment processing via Managed Payments)
    bestFor: "electronics, tech accessories, collectibles, and cross-border export sales",
    priceRange: { sweet: [800, 15000] },
  },
  ETSY: {
    displayName: "Etsy",
    strengths: [
      "handmade", "vintage", "craft", "unique", "candle", "soap",
      "jewelry", "ring", "necklace", "bracelet", "earring",
      "art", "print", "sticker", "decor", "gift", "custom",
      "personalized", "organic", "natural", "pottery", "ceramic",
      "knit", "crochet", "sewing", "fabric", "leather",
    ],
    // ~6.5% transaction fee + ~3% payment processing = ~9.5% variable rate.
    // NOTE: Excludes $0.20 listing fee + ~$0.25 regulatory operating fee per txn
    // (adds ~5% effective overhead on ₹800 items at the sweet lower bound)
    // and potential 15% offsite-ads fee on attributed sales. Effective rate
    // for low-priced listings can reach ~20%+.
    avgFeeRate: 0.095,
    bestFor: "handmade goods, candles, jewelry, art prints, and personalized gifts",
    priceRange: { sweet: [800, 8000] },
  },
  FLIPKART: {
    displayName: "Flipkart",
    strengths: [
      "electronics", "mobile", "phone", "cable", "charger", "adapter",
      "laptop", "tablet", "speaker", "headphone", "earphone",
      "fashion", "clothing", "shoe", "footwear", "bag",
      "appliance", "kitchen", "home", "furniture", "grocery",
      "beauty", "grooming", "toy", "book",
    ],
    avgFeeRate: 0.1, // ~10% commission (payment processing included)
    bestFor: "electronics, mobile accessories, fashion, and home essentials in India",
    currency: "INR",
    priceRange: { sweet: [200, 5000] },
  },
  WOOCOMMERCE: {
    displayName: "WooCommerce",
    strengths: [
      "custom", "dtc", "digital", "download", "subscription",
      "niche", "specialty", "course", "ebook", "software",
      "membership", "service",
    ],
    avgFeeRate: 0.029, // no platform fee, ~2–3% payment gateway (Razorpay/Cashfree in India; Stripe internationally)
    bestFor: "digital products, subscriptions, and niche D2C brands",
    priceRange: { sweet: [500, 15000] },
  },
  BIGCOMMERCE: {
    displayName: "BigCommerce",
    strengths: [
      "wholesale", "bulk", "industrial", "supply", "equipment",
      "multi-channel", "scalable", "catalog", "parts",
      "office", "furniture", "commercial",
    ],
    avgFeeRate: 0.029, // no platform fee, ~2–3% payment gateway (Razorpay/Cashfree in India; Stripe internationally)
    bestFor: "B2B wholesale, bulk orders, and high-volume multi-channel sellers",
    priceRange: { sweet: [1000, 20000] },
  },
  WIX: {
    displayName: "Wix",
    strengths: [
      "local", "boutique", "small-business", "artisan",
      "food", "bakery", "clothing", "accessories", "gift",
      "service", "booking",
    ],
    avgFeeRate: 0.029, // no platform fee, ~2–3% payment gateway (Razorpay/Cashfree in India; Stripe internationally)
    bestFor: "local boutiques, artisan products, and small businesses",
    priceRange: { sweet: [200, 5000] },
  },
  AMAZON: {
    displayName: "Amazon India",
    strengths: [
      "electronics", "mobile", "phone", "cable", "charger", "adapter",
      "laptop", "tablet", "speaker", "headphone", "earphone",
      "fashion", "clothing", "shoe", "footwear", "bag",
      "home", "kitchen", "appliance", "furniture", "grocery",
      "beauty", "grooming", "book", "toy", "health",
      "refurbished", "fba",
    ],
    avgFeeRate: 0.11, // ~8–15% referral fee (category-dependent) + closing fee; averaged ~11%
    bestFor: "broad-market products, electronics, fashion, home goods, and FBA-enabled sellers in India",
    currency: "INR",
    priceRange: { sweet: [300, 15000] },
  },
  // NOTE: Square is omitted — it does not operate in India.
  // Square-connected users still get benchmark-backed (Tier 2) recommendations.
  // Display name is provided via DISPLAY_NAMES fallback below.
  MAGENTO: {
    displayName: "Magento",
    strengths: [
      "enterprise", "high-volume", "catalog", "industrial",
      "manufacturing", "wholesale", "international",
      "multi-store", "complex", "automotive",
    ],
    avgFeeRate: 0.029, // Magento Open Source: no platform fee, ~2–3% payment gateway; Adobe Commerce adds substantial licensing costs on top
    bestFor: "enterprise e-commerce, large catalogs, and international multi-store operations",
    priceRange: { sweet: [1000, 50000] },
  },
};

/**
 * Get display name for a marketplace enum value.
 */
export function getMarketplaceDisplayName(marketplace: string): string {
  if (!marketplace || marketplace.trim() === "") {
    console.warn("getMarketplaceDisplayName called with empty marketplace");
    return "Unknown Marketplace";
  }
  const key = marketplace.trim().toUpperCase();
  return MARKETPLACE_PRIORS[key]?.displayName ?? DISPLAY_NAMES[key] ?? marketplace.trim();
}
