export const PRICING = {
  BASE_PRICE: 999,
  ADDITIONAL_PRICE: 449,
  INCLUDED_MARKETPLACES: 2,
  CURRENCY_SYMBOL: "₹",
};

/**
 * Calculate monthly subscription price based on marketplace count.
 * Base price covers up to INCLUDED_MARKETPLACES connections.
 *
 * @returns Price in paise (smallest currency unit, integer).
 *          e.g. ₹999 → 99900, ₹1448 → 144800
 */
export function calculateMonthlyPrice(marketplaceCount: number): number {
  if (marketplaceCount <= 0) return 0;
  const priceInRupees =
    marketplaceCount <= PRICING.INCLUDED_MARKETPLACES
      ? PRICING.BASE_PRICE
      : PRICING.BASE_PRICE +
        (marketplaceCount - PRICING.INCLUDED_MARKETPLACES) *
          PRICING.ADDITIONAL_PRICE;
  // Multiply in rupees (whole numbers) then round to guarantee an integer.
  // All PRICING constants are whole numbers so the result is always exact.
  return Math.round(priceInRupees * 100);
}

/**
 * Get price breakdown for display.
 * All prices returned in paise (smallest currency unit).
 */
export function getPriceBreakdown(marketplaceCount: number): {
  basePrice: number;
  additionalCount: number;
  additionalPrice: number;
  totalPrice: number;
} {
  if (marketplaceCount <= 0) {
    return {
      basePrice: 0,
      additionalCount: 0,
      additionalPrice: 0,
      totalPrice: 0,
    };
  }

  const additionalCount = Math.max(
    0,
    marketplaceCount - PRICING.INCLUDED_MARKETPLACES
  );
  return {
    basePrice: PRICING.BASE_PRICE * 100,
    additionalCount,
    additionalPrice: additionalCount * PRICING.ADDITIONAL_PRICE * 100,
    totalPrice: calculateMonthlyPrice(marketplaceCount),
  };
}

/**
 * Format price for display.
 * @param priceInPaise - Price in paise (smallest currency unit)
 */
export function formatPrice(priceInPaise: number): string {
  return `${PRICING.CURRENCY_SYMBOL}${Math.round(priceInPaise / 100)}`;
}
