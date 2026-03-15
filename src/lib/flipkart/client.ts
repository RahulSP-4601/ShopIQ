import { decryptToken } from "@/lib/shopify/oauth";

const FLIPKART_API_BASE = "https://api.flipkart.net/sellers";
const FETCH_TIMEOUT_MS = 30000;

export interface FlipkartSellerInfo {
  sellerId: string;
  sellerName: string;
}

export interface FlipkartListingsResponse {
  listings: FlipkartListing[];
  nextUrl?: string;
}

export interface FlipkartListing {
  listingId: string;
  skuId: string;
  productId: string;
  title: string;
  mrp?: number;
  sellingPrice?: number;
  stock?: number;
}

export interface FlipkartShipment {
  shipmentId: string;
  orderId: string;
  orderDate?: string;
  status?: string;
  orderItems: FlipkartOrderItem[];
}

export interface FlipkartOrderItem {
  orderItemId: string;
  sku: string;
  quantity: number;
  priceComponents: Record<string, number>;
}

export interface FlipkartShipmentsResponse {
  shipments: FlipkartShipment[];
  nextPageUrl?: string;
  hasMore: boolean;
}

export class FlipkartClient {
  private accessToken: string;

  constructor(encryptedAccessToken: string, isEncrypted: boolean = true) {
    this.accessToken = isEncrypted
      ? decryptToken(encryptedAccessToken)
      : encryptedAccessToken;
  }

  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${FLIPKART_API_BASE}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Flipkart API error: ${response.status} - ${error}`);
      }

      return response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetch seller profile info.
   * Used during OAuth callback to get externalId and externalName.
   */
  async getSellerInfo(): Promise<FlipkartSellerInfo> {
    const data = await this.fetch<FlipkartSellerInfo>("/v3/profile");
    return data;
  }

  /**
   * Search and filter shipments/orders.
   */
  async getShipments(params?: {
    orderStates?: string[];
    createdAfter?: string;
    createdBefore?: string;
  }): Promise<FlipkartShipmentsResponse> {
    const filter: Record<string, unknown> = {};

    if (params?.orderStates) {
      filter.states = params.orderStates;
    }
    if (params?.createdAfter) {
      filter.orderDate = {
        fromDate: params.createdAfter,
        ...(params.createdBefore && { toDate: params.createdBefore }),
      };
    }

    return this.fetch<FlipkartShipmentsResponse>("/v3/shipments/filter/", {
      method: "POST",
      body: JSON.stringify({ filter }),
    });
  }

  /**
   * Fetch product listings.
   */
  async getListings(nextUrl?: string): Promise<FlipkartListingsResponse> {
    const endpoint = nextUrl || "/v3/listings/search";
    return this.fetch<FlipkartListingsResponse>(endpoint, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }
}
