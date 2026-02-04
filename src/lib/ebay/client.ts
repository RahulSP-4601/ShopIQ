import { decryptToken } from "@/lib/shopify/oauth";

const EBAY_API_BASE = "https://api.ebay.com";
const FETCH_TIMEOUT_MS = 30000;

export interface EbayUserInfo {
  userId: string;
  username: string;
}

export interface EbayOrder {
  orderId: string;
  creationDate: string;
  orderFulfillmentStatus: string;
  orderPaymentStatus: string;
  pricingSummary: {
    total: { value: string; currency: string };
  };
  buyer: { username: string };
  lineItems: EbayLineItem[];
}

export interface EbayLineItem {
  lineItemId: string;
  title: string;
  sku: string;
  quantity: number;
  lineItemCost: { value: string; currency: string };
}

export interface EbayOrdersResponse {
  orders: EbayOrder[];
  total: number;
  offset: number;
  limit: number;
  next?: string;
}

export interface EbayInventoryItem {
  sku: string;
  locale: string;
  product: {
    title: string;
    description: string;
    imageUrls: string[];
  };
  availability: {
    shipToLocationAvailability: {
      quantity: number;
    };
  };
}

export interface EbayInventoryResponse {
  inventoryItems: EbayInventoryItem[];
  total: number;
  offset: number;
  limit: number;
  next?: string;
}

export class EbayClient {
  private accessToken: string;
  private marketplaceId: string;

  constructor(
    encryptedAccessToken: string,
    isEncrypted: boolean = true,
    marketplaceId: string = "EBAY_US"
  ) {
    this.accessToken = isEncrypted
      ? decryptToken(encryptedAccessToken)
      : encryptedAccessToken;
    this.marketplaceId = marketplaceId;
  }

  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T | null> {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${EBAY_API_BASE}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
          "X-EBAY-C-MARKETPLACE-ID": this.marketplaceId,
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`eBay API error: ${response.status} - ${error}`);
      }

      if (response.status === 204) {
        return null;
      }

      const text = await response.text();
      if (!text.trim()) {
        return null;
      }

      try {
        return JSON.parse(text) as T;
      } catch {
        throw new Error(
          `eBay API returned invalid JSON for ${endpoint} (status ${response.status})`
        );
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetch authenticated user's identity info.
   * Used during OAuth callback to get externalId and externalName.
   */
  async getUserInfo(): Promise<EbayUserInfo> {
    const data = await this.fetch<{ userId: string; username: string }>(
      "/commerce/identity/v1/user/"
    );
    if (!data) {
      throw new Error("eBay identity API returned an empty response");
    }
    return {
      userId: data.userId,
      username: data.username,
    };
  }

  /**
   * Fetch seller orders with optional date filtering.
   */
  async getOrders(params?: {
    limit?: number;
    offset?: number;
    createdAfter?: string;
  }): Promise<EbayOrdersResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit != null) searchParams.set("limit", String(params.limit));
    if (params?.offset != null) searchParams.set("offset", String(params.offset));
    if (params?.createdAfter) {
      const parsed = new Date(params.createdAfter);
      if (isNaN(parsed.getTime())) {
        throw new Error(
          `Invalid createdAfter date: "${params.createdAfter}" — expected ISO-8601 format`
        );
      }
      const normalized = parsed.toISOString();
      searchParams.set("filter", `creationdate:[${normalized}..]`);
    }

    const query = searchParams.toString();
    const endpoint = `/sell/fulfillment/v1/order${query ? `?${query}` : ""}`;
    const data = await this.fetch<EbayOrdersResponse>(endpoint);
    if (!data) {
      return { orders: [], total: 0, offset: 0, limit: 0 };
    }
    return data;
  }

  /**
   * Fetch inventory items (product listings).
   */
  async getInventoryItems(params?: {
    limit?: number;
    offset?: number;
  }): Promise<EbayInventoryResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit != null) searchParams.set("limit", String(params.limit));
    if (params?.offset != null) searchParams.set("offset", String(params.offset));

    const query = searchParams.toString();
    const endpoint = `/sell/inventory/v1/inventory_item${query ? `?${query}` : ""}`;
    const data = await this.fetch<EbayInventoryResponse>(endpoint);
    if (!data) {
      return { inventoryItems: [], total: 0, offset: 0, limit: 0 };
    }
    return data;
  }
}
