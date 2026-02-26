import { MarketplaceType } from "@prisma/client";

export interface MarketplaceConfig {
  id: MarketplaceType;
  name: string;
  color: string;
  description: string;
  hasOAuth: boolean;
  logo: string;
}

export const MARKETPLACES: MarketplaceConfig[] = [
  {
    id: "SHOPIFY",
    name: "Shopify",
    color: "#95BF47",
    description: "Connect your Shopify store",
    hasOAuth: true,
    logo: "shopify",
  },
  {
    id: "AMAZON",
    name: "Amazon Seller Central",
    color: "#FF9900",
    description: "Connect your Amazon seller account",
    hasOAuth: false,
    logo: "amazon",
  },
  {
    id: "EBAY",
    name: "eBay",
    color: "#E53238",
    description: "Connect your eBay seller account",
    hasOAuth: false,
    logo: "ebay",
  },
  {
    id: "ETSY",
    name: "Etsy",
    color: "#F56400",
    description: "Connect your Etsy shop",
    hasOAuth: false,
    logo: "etsy",
  },
  {
    id: "WOOCOMMERCE",
    name: "WooCommerce",
    color: "#96588A",
    description: "Connect your WooCommerce store",
    hasOAuth: false,
    logo: "woocommerce",
  },
  {
    id: "BIGCOMMERCE",
    name: "BigCommerce",
    color: "#121118",
    description: "Connect your BigCommerce store",
    hasOAuth: false,
    logo: "bigcommerce",
  },
  {
    id: "WIX",
    name: "Wix eCommerce",
    color: "#0C6EFC",
    description: "Connect your Wix online store",
    hasOAuth: false,
    logo: "wix",
  },
  {
    id: "SQUARE",
    name: "Square Online",
    color: "#006AFF",
    description: "Connect your Square Online store",
    hasOAuth: false,
    logo: "square",
  },
  {
    id: "MAGENTO",
    name: "Magento",
    color: "#F26322",
    description: "Connect your Magento (Adobe Commerce) store",
    hasOAuth: false,
    logo: "magento",
  },
  {
    id: "PRESTASHOP",
    name: "PrestaShop",
    color: "#DF0067",
    description: "Connect your PrestaShop store",
    hasOAuth: false,
    logo: "prestashop",
  },
  {
    id: "FLIPKART",
    name: "Flipkart",
    color: "#2874F0",
    description: "Connect your Flipkart seller account",
    hasOAuth: false,
    logo: "flipkart",
  },
];

export function getMarketplaceConfig(
  id: MarketplaceType
): MarketplaceConfig | undefined {
  return MARKETPLACES.find((m) => m.id === id);
}
