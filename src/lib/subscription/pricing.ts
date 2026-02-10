export const PRICING = {
  BASE_PRICE: 999,
  ADDITIONAL_PRICE: 449,
  INCLUDED_MARKETPLACES: 2,
  CURRENCY_SYMBOL: "₹",
};

/**
 * Calculate monthly subscription price based on marketplace count.
 * Base price covers up to INCLUDED_MARKETPLACES connections.
 */
export function calculateMonthlyPrice(marketplaceCount: number): number {
  if (marketplaceCount <= 0) return 0;
  if (marketplaceCount <= PRICING.INCLUDED_MARKETPLACES)
    return PRICING.BASE_PRICE;
  return (
    PRICING.BASE_PRICE +
    (marketplaceCount - PRICING.INCLUDED_MARKETPLACES) *
      PRICING.ADDITIONAL_PRICE
  );
}

/**
 * Get price breakdown for display
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
    basePrice: PRICING.BASE_PRICE,
    additionalCount,
    additionalPrice: additionalCount * PRICING.ADDITIONAL_PRICE,
    totalPrice: calculateMonthlyPrice(marketplaceCount),
  };
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  return `${PRICING.CURRENCY_SYMBOL}${Math.round(price)}`;
}
