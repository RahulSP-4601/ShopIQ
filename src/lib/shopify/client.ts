import { Store } from "@prisma/client";
import { decryptToken } from "./oauth";

// Use a supported Shopify API version - update this periodically
// Supported versions as of 2026: 2026-01, 2025-10, 2025-07, 2025-04
const API_VERSION = process.env.SHOPIFY_API_VERSION || "2025-10";
const FETCH_TIMEOUT_MS = 30000; // 30 second timeout for API calls

export class ShopifyClient {
  private store: Store;
  private accessToken: string;

  /**
   * Create a ShopifyClient
   * @param store - Store object with accessToken
   * @param isEncrypted - Whether the accessToken in store is encrypted (default: true for DB-stored tokens)
   */
  constructor(store: Store, isEncrypted: boolean = true) {
    if (!store.accessToken) {
      throw new Error("Store access token is required for API calls");
    }
    this.store = store;
    // Decrypt the token if it's encrypted (tokens from database are encrypted)
    // Pass isEncrypted=false when using a temp store with plaintext token
    this.accessToken = isEncrypted ? decryptToken(store.accessToken) : store.accessToken;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `https://${this.store.domain}/admin/api/${API_VERSION}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "X-Shopify-Access-Token": this.accessToken,
          "Content-Type": "application/json",
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Shopify API error: ${response.status} - ${error}`);
      }

      return response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async getShopInfo(): Promise<ShopifyShop> {
    const data = await this.fetch<{ shop: ShopifyShop }>("/shop.json");
    return data.shop;
  }

  async getProductsCount(): Promise<number> {
    const data = await this.fetch<{ count: number }>("/products/count.json");
    return data.count;
  }

  async getProducts(params?: { limit?: number; page_info?: string }): Promise<{
    products: ShopifyProduct[];
    nextPageInfo?: string;
  }> {
    const searchParams = new URLSearchParams();
    searchParams.set("limit", String(params?.limit || 250));
    if (params?.page_info) {
      searchParams.set("page_info", params.page_info);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(
        `https://${this.store.domain}/admin/api/${API_VERSION}/products.json?${searchParams}`,
        {
          signal: controller.signal,
          headers: {
            "X-Shopify-Access-Token": this.accessToken,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status}`);
      }

      const data = await response.json();
      const linkHeader = response.headers.get("Link");
      const nextPageInfo = extractNextPageInfo(linkHeader);

      return {
        products: data.products,
        nextPageInfo,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async getCustomersCount(): Promise<number> {
    const data = await this.fetch<{ count: number }>("/customers/count.json");
    return data.count;
  }

  async getCustomers(params?: { limit?: number; page_info?: string }): Promise<{
    customers: ShopifyCustomer[];
    nextPageInfo?: string;
  }> {
    const searchParams = new URLSearchParams();
    searchParams.set("limit", String(params?.limit || 250));
    if (params?.page_info) {
      searchParams.set("page_info", params.page_info);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(
        `https://${this.store.domain}/admin/api/${API_VERSION}/customers.json?${searchParams}`,
        {
          signal: controller.signal,
          headers: {
            "X-Shopify-Access-Token": this.accessToken,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status}`);
      }

      const data = await response.json();
      const linkHeader = response.headers.get("Link");
      const nextPageInfo = extractNextPageInfo(linkHeader);

      return {
        customers: data.customers,
        nextPageInfo,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async getOrdersCount(createdAtMin?: Date): Promise<number> {
    const searchParams = new URLSearchParams({ status: "any" });
    if (createdAtMin) {
      searchParams.set("created_at_min", createdAtMin.toISOString());
    }

    const data = await this.fetch<{ count: number }>(
      `/orders/count.json?${searchParams}`
    );
    return data.count;
  }

  async getOrders(params?: {
    limit?: number;
    page_info?: string;
    created_at_min?: Date;
    updated_at_min?: Date;
  }): Promise<{
    orders: ShopifyOrder[];
    nextPageInfo?: string;
  }> {
    const searchParams = new URLSearchParams({ status: "any" });
    searchParams.set("limit", String(params?.limit || 250));
    if (params?.page_info) {
      searchParams.set("page_info", params.page_info);
    }
    if (params?.updated_at_min) {
      searchParams.set("updated_at_min", params.updated_at_min.toISOString());
    } else if (params?.created_at_min) {
      searchParams.set("created_at_min", params.created_at_min.toISOString());
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(
        `https://${this.store.domain}/admin/api/${API_VERSION}/orders.json?${searchParams}`,
        {
          signal: controller.signal,
          headers: {
            "X-Shopify-Access-Token": this.accessToken,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status}`);
      }

      const data = await response.json();
      const linkHeader = response.headers.get("Link");
      const nextPageInfo = extractNextPageInfo(linkHeader);

      return {
        orders: data.orders,
        nextPageInfo,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

function extractNextPageInfo(linkHeader: string | null): string | undefined {
  if (!linkHeader) return undefined;

  const matches = linkHeader.match(/<[^>]*page_info=([^>&]*)[^>]*>; rel="next"/);
  return matches?.[1];
}

// Shopify Types
export interface ShopifyShop {
  id: number;
  name: string;
  email: string;
  domain: string;
  myshopify_domain: string;
  currency: string;
  timezone: string;
  iana_timezone: string;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  product_type: string;
  vendor: string;
  status: string;
  created_at: string;
  updated_at: string;
  images: { src: string }[];
  variants: ShopifyVariant[];
}

export interface ShopifyVariant {
  id: number;
  product_id: number;
  title: string;
  sku: string;
  price: string;
  compare_at_price: string | null;
  inventory_quantity: number;
}

export interface ShopifyCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  orders_count: number;
  total_spent: string;
  accepts_marketing: boolean;
  tags: string;
  created_at: string;
  default_address?: {
    city: string;
    province: string;
    country: string;
  };
}

export interface ShopifyOrder {
  id: number;
  order_number: number;
  name: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  total_discounts: string;
  total_shipping_price_set?: {
    shop_money: { amount: string };
  };
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  source_name: string;
  customer?: {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  shipping_address?: {
    city: string;
    province: string;
    country: string;
  };
  fulfillments?: Array<{
    id: number;
    status: string;
    created_at: string;
    updated_at: string;
  }>;
  line_items: ShopifyLineItem[];
}

export interface ShopifyLineItem {
  id: number;
  product_id: number | null;
  variant_id: number | null;
  title: string;
  variant_title: string;
  sku: string;
  quantity: number;
  price: string;
  total_discount: string;
}
