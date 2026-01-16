import { Store } from "@prisma/client";

const API_VERSION = "2024-01";

export class ShopifyClient {
  private store: Store;

  constructor(store: Store) {
    this.store = store;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `https://${this.store.domain}/admin/api/${API_VERSION}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "X-Shopify-Access-Token": this.store.accessToken,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Shopify API error: ${response.status} - ${error}`);
    }

    return response.json();
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

    const response = await fetch(
      `https://${this.store.domain}/admin/api/${API_VERSION}/products.json?${searchParams}`,
      {
        headers: {
          "X-Shopify-Access-Token": this.store.accessToken,
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

    const response = await fetch(
      `https://${this.store.domain}/admin/api/${API_VERSION}/customers.json?${searchParams}`,
      {
        headers: {
          "X-Shopify-Access-Token": this.store.accessToken,
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
  }): Promise<{
    orders: ShopifyOrder[];
    nextPageInfo?: string;
  }> {
    const searchParams = new URLSearchParams({ status: "any" });
    searchParams.set("limit", String(params?.limit || 250));
    if (params?.page_info) {
      searchParams.set("page_info", params.page_info);
    }
    if (params?.created_at_min) {
      searchParams.set("created_at_min", params.created_at_min.toISOString());
    }

    const response = await fetch(
      `https://${this.store.domain}/admin/api/${API_VERSION}/orders.json?${searchParams}`,
      {
        headers: {
          "X-Shopify-Access-Token": this.store.accessToken,
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
  };
  shipping_address?: {
    city: string;
    province: string;
    country: string;
  };
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
