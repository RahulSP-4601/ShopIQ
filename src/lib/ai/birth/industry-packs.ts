import { IndustryType } from "@prisma/client";

// -------------------------------------------------------
// Types
// -------------------------------------------------------

export interface BeliefTemplate {
  statement: string;
  strength: number;
  contextKey: string;
  description: string;
}

export interface IndustryPack {
  industry: IndustryType;
  beliefs: BeliefTemplate[];
}

// -------------------------------------------------------
// Context Key Helper
// -------------------------------------------------------

/**
 * Generate a contextKey from an IndustryType, ensuring consistent
 * lowercase casing derived from the enum value.
 * Format: `<industry_lowercase>|<region>|<time>|<price>|<channel>`
 */
function industryCtx(industry: IndustryType, rest = "*|*|*|*"): string {
  return `${industry.toLowerCase()}|${rest}`;
}

// -------------------------------------------------------
// Shared beliefs (seeded for every industry)
// -------------------------------------------------------

const SHARED_BELIEFS: BeliefTemplate[] = [
  {
    statement: "analyze_revenue",
    strength: 0.55,
    contextKey: "*",
    description: "Revenue analysis is reliable for this business",
  },
  {
    statement: "analyze_products",
    strength: 0.55,
    contextKey: "*",
    description: "Product performance analysis helps identify winners and losers",
  },
  {
    statement: "detect_low_stock",
    strength: 0.55,
    contextKey: "*",
    description: "Inventory monitoring helps prevent stockouts",
  },
  {
    statement: "analyze_daily_trends",
    strength: 0.50,
    contextKey: "*",
    description: "Daily trend analysis reveals actionable patterns",
  },
];

// -------------------------------------------------------
// Industry-Specific Packs
// -------------------------------------------------------

const FASHION_PACK: IndustryPack = {
  industry: "FASHION",
  beliefs: [
    ...SHARED_BELIEFS,
    {
      statement: "seasonal_trends_matter",
      strength: 0.60,
      contextKey: industryCtx("FASHION"),
      description: "Fashion sales are highly seasonal — track trends around festivals and weather changes",
    },
    {
      statement: "size_returns_expected",
      strength: 0.55,
      contextKey: industryCtx("FASHION"),
      description: "Size-related returns are normal in fashion — monitor return rates by size",
    },
    {
      statement: "weekend_sales_spike",
      strength: 0.55,
      contextKey: industryCtx("FASHION", "*|weekend|*|*"),
      description: "Fashion categories often see 30-40% higher weekend sales",
    },
    {
      statement: "forecast_demand",
      strength: 0.50,
      contextKey: industryCtx("FASHION"),
      description: "Demand forecasting is moderately reliable for fashion given seasonal patterns",
    },
  ],
};

const ELECTRONICS_PACK: IndustryPack = {
  industry: "ELECTRONICS",
  beliefs: [
    ...SHARED_BELIEFS,
    {
      statement: "price_sensitivity_high",
      strength: 0.60,
      contextKey: industryCtx("ELECTRONICS"),
      description: "Electronics buyers are highly price-sensitive — monitor competitor pricing",
    },
    {
      statement: "product_lifecycle_short",
      strength: 0.55,
      contextKey: industryCtx("ELECTRONICS"),
      description: "Electronics have short lifecycles — track inventory aging to avoid obsolescence",
    },
    {
      statement: "review_impact_high",
      strength: 0.55,
      contextKey: industryCtx("ELECTRONICS"),
      description: "Product reviews strongly influence electronics purchase decisions",
    },
    {
      statement: "sale_event_spikes",
      strength: 0.60,
      contextKey: industryCtx("ELECTRONICS"),
      description: "Electronics see major spikes during sale events (Black Friday, Prime Day, festivals)",
    },
  ],
};

const HOME_GARDEN_PACK: IndustryPack = {
  industry: "HOME_GARDEN",
  beliefs: [
    ...SHARED_BELIEFS,
    {
      statement: "seasonal_demand_strong",
      strength: 0.60,
      contextKey: industryCtx("HOME_GARDEN"),
      description: "Home & garden products have strong seasonal demand tied to weather and holidays",
    },
    {
      statement: "bundle_opportunities",
      strength: 0.55,
      contextKey: industryCtx("HOME_GARDEN"),
      description: "Home products have natural bundling opportunities — suggest complementary items",
    },
    {
      statement: "shipping_cost_matters",
      strength: 0.55,
      contextKey: industryCtx("HOME_GARDEN"),
      description: "Bulky home items make shipping costs a major factor in profitability",
    },
    {
      statement: "weekend_browsing_peak",
      strength: 0.50,
      contextKey: industryCtx("HOME_GARDEN", "*|weekend|*|*"),
      description: "Weekend browsing and purchasing peaks for home improvement items",
    },
  ],
};

const FOOD_BEVERAGE_PACK: IndustryPack = {
  industry: "FOOD_BEVERAGE",
  beliefs: [
    ...SHARED_BELIEFS,
    {
      statement: "expiry_tracking_critical",
      strength: 0.65,
      contextKey: industryCtx("FOOD_BEVERAGE"),
      description: "Product expiry dates are critical — monitor inventory freshness closely",
    },
    {
      statement: "repeat_purchase_high",
      strength: 0.60,
      contextKey: industryCtx("FOOD_BEVERAGE"),
      description: "Food & beverage has high repeat purchase rates — track customer retention",
    },
    {
      statement: "subscription_potential",
      strength: 0.55,
      contextKey: industryCtx("FOOD_BEVERAGE"),
      description: "Many food products suit subscription models — identify recurring buyers",
    },
    {
      statement: "seasonal_flavors_matter",
      strength: 0.50,
      contextKey: industryCtx("FOOD_BEVERAGE"),
      description: "Seasonal and limited-edition flavors drive significant spikes",
    },
  ],
};

const HEALTH_BEAUTY_PACK: IndustryPack = {
  industry: "HEALTH_BEAUTY",
  beliefs: [
    ...SHARED_BELIEFS,
    {
      statement: "repeat_purchase_high",
      strength: 0.60,
      contextKey: industryCtx("HEALTH_BEAUTY"),
      description: "Health & beauty products have strong repeat purchase patterns",
    },
    {
      statement: "influencer_impact",
      strength: 0.55,
      contextKey: industryCtx("HEALTH_BEAUTY"),
      description: "Social media and influencer mentions can cause sudden demand spikes",
    },
    {
      statement: "ingredient_trends_matter",
      strength: 0.55,
      contextKey: industryCtx("HEALTH_BEAUTY"),
      description: "Trending ingredients drive product discovery and sales",
    },
    {
      statement: "gift_season_boost",
      strength: 0.55,
      contextKey: industryCtx("HEALTH_BEAUTY"),
      description: "Gift-giving seasons (festivals, Valentine's) boost beauty product sales significantly",
    },
  ],
};

const HANDMADE_CRAFT_PACK: IndustryPack = {
  industry: "HANDMADE_CRAFT",
  beliefs: [
    ...SHARED_BELIEFS,
    {
      statement: "uniqueness_is_value",
      strength: 0.60,
      contextKey: industryCtx("HANDMADE_CRAFT"),
      description: "Uniqueness and story drive value — don't compete on price alone",
    },
    {
      statement: "production_capacity_limited",
      strength: 0.60,
      contextKey: industryCtx("HANDMADE_CRAFT"),
      description: "Production capacity is limited — monitor order volume vs. fulfillment ability",
    },
    {
      statement: "festival_gift_demand",
      strength: 0.55,
      contextKey: industryCtx("HANDMADE_CRAFT"),
      description: "Handmade items see gift-driven demand spikes around festivals and holidays",
    },
    {
      statement: "custom_order_tracking",
      strength: 0.50,
      contextKey: industryCtx("HANDMADE_CRAFT"),
      description: "Custom orders need special tracking — longer lead times and unique pricing",
    },
  ],
};

const OTHER_PACK: IndustryPack = {
  industry: "OTHER",
  beliefs: [
    ...SHARED_BELIEFS,
    {
      statement: "describe_store_status",
      strength: 0.55,
      contextKey: "*",
      description: "Store overview provides useful high-level business context",
    },
    {
      statement: "compare_channels",
      strength: 0.50,
      contextKey: "*",
      description: "Cross-channel comparison reveals marketplace-specific patterns",
    },
    {
      statement: "forecast_demand",
      strength: 0.50,
      contextKey: "*",
      description: "Demand forecasting helps with inventory planning",
    },
    {
      statement: "analyze_customers",
      strength: 0.50,
      contextKey: "*",
      description: "Customer analysis identifies top buyers and retention patterns",
    },
  ],
};

/**
 * Create a default pack for industries without dedicated beliefs.
 * Uses OTHER_PACK's generic beliefs with the correct industry field.
 */
function defaultPack(industry: IndustryType): IndustryPack {
  return { ...OTHER_PACK, industry };
}

// -------------------------------------------------------
// Pack Registry
// -------------------------------------------------------

const INDUSTRY_PACKS: Record<IndustryType, IndustryPack> = {
  FASHION: FASHION_PACK,
  ELECTRONICS: ELECTRONICS_PACK,
  HOME_GARDEN: HOME_GARDEN_PACK,
  FOOD_BEVERAGE: FOOD_BEVERAGE_PACK,
  HEALTH_BEAUTY: HEALTH_BEAUTY_PACK,
  HANDMADE_CRAFT: HANDMADE_CRAFT_PACK,
  OTHER: OTHER_PACK,
  SPORTS_OUTDOOR: defaultPack("SPORTS_OUTDOOR"),
  TOYS_GAMES: defaultPack("TOYS_GAMES"),
  BOOKS_MEDIA: defaultPack("BOOKS_MEDIA"),
  AUTOMOTIVE: defaultPack("AUTOMOTIVE"),
  JEWELRY: defaultPack("JEWELRY"),
  PET_SUPPLIES: defaultPack("PET_SUPPLIES"),
};

/**
 * Get the industry knowledge pack for a given industry type.
 */
export function getIndustryPack(industry: IndustryType): IndustryPack {
  return INDUSTRY_PACKS[industry];
}

/**
 * Get all available industry packs.
 */
export function getAllIndustryPacks(): IndustryPack[] {
  return Object.values(INDUSTRY_PACKS);
}
