import { decryptToken } from "@/lib/shopify/oauth";

const SNAPDEAL_API_BASE = "https://apigateway.snapdeal.com/seller-api";
const FETCH_TIMEOUT_MS = 30000;

// SnapDeal API response types

export interface SnapDealSellerInfo {
  sellerId: string;
  sellerName: string;
}

export interface SnapDealOrder {
  orderId: string;
  subOrderId: string;
  createdDate: string;
  status: string; // PFF, PRNT, SHIPPED, DELIVERED, CANCELLED, etc.
  price: number;
  shippingCharge: number;
  currency: string;
  productTitle: string;
  sku: string;
  quantity: number;
  buyerName?: string;
}

export interface SnapDealOrdersResponse {
  orders: SnapDealOrder[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface SnapDealProduct {
  supc: string; // Snapdeal Unique Product Code
  title: string;
  sku: string;
  mrp: number;
  sellingPrice: number;
  currency: string;
  inventory: number;
  status: string; // ACTIVE, INACTIVE, etc.
  imageUrl?: string;
  category?: string;
}

export interface SnapDealProductsResponse {
  products: SnapDealProduct[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export class SnapDealClient {
  private sellerToken: string;
  private clientId: string;
  private authToken: string;

  constructor(
    encryptedSellerToken: string,
    clientId: string,
    authToken: string,
    isEncrypted: boolean = true
  ) {
    this.sellerToken = isEncrypted
      ? decryptToken(encryptedSellerToken)
      : encryptedSellerToken;
    this.clientId = clientId;
    this.authToken = authToken;
  }

  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T | null> {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${SNAPDEAL_API_BASE}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          clientId: this.clientId,
          "X-Auth-Token": this.authToken,
          "X-Seller-AuthZ-Token": this.sellerToken,
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(
          `SnapDeal API error: ${response.status} ${response.statusText} for ${endpoint}`
        );
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
          `SnapDeal API returned invalid JSON for ${endpoint} (status ${response.status})`
        );
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(
          `SnapDeal API request timed out after ${FETCH_TIMEOUT_MS}ms for ${endpoint}`
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetch authenticated seller's identity info.
   * Used during callback to get externalId and externalName.
   */
  async getSellerInfo(): Promise<SnapDealSellerInfo> {
    const data = await this.fetch<{ sellerId: string; sellerName: string }>(
      "/seller"
    );
    if (!data) {
      throw new Error("SnapDeal seller API returned an empty response");
    }
    return {
      sellerId: data.sellerId,
      sellerName: data.sellerName,
    };
  }

  /**
   * Fetch new/pending orders (PFF and PRNT status).
   */
  async getNewOrders(params?: {
    pageSize?: number;
    pageNumber?: number;
  }): Promise<SnapDealOrdersResponse> {
    const searchParams = new URLSearchParams();
    if (params?.pageSize != null)
      searchParams.set("pageSize", String(params.pageSize));
    if (params?.pageNumber != null)
      searchParams.set("pageNumber", String(params.pageNumber));

    const query = searchParams.toString();
    const endpoint = `/orders/new${query ? `?${query}` : ""}`;
    const data = await this.fetch<SnapDealOrdersResponse>(endpoint);
    if (!data) {
      return {
        orders: [],
        totalCount: 0,
        pageNumber: params?.pageNumber ?? 1,
        pageSize: params?.pageSize ?? 50,
      };
    }
    return data;
  }

  /**
   * Fetch completed orders (shipped/delivered).
   */
  async getCompletedOrders(params?: {
    pageSize?: number;
    pageNumber?: number;
  }): Promise<SnapDealOrdersResponse> {
    const searchParams = new URLSearchParams();
    if (params?.pageSize != null)
      searchParams.set("pageSize", String(params.pageSize));
    if (params?.pageNumber != null)
      searchParams.set("pageNumber", String(params.pageNumber));

    const query = searchParams.toString();
    const endpoint = `/orders/completed${query ? `?${query}` : ""}`;
    const data = await this.fetch<SnapDealOrdersResponse>(endpoint);
    if (!data) {
      return {
        orders: [],
        totalCount: 0,
        pageNumber: params?.pageNumber ?? 1,
        pageSize: params?.pageSize ?? 50,
      };
    }
    return data;
  }

  /**
   * Fetch product listings.
   */
  async getProducts(params?: {
    pageSize?: number;
    pageNumber?: number;
  }): Promise<SnapDealProductsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.pageSize != null)
      searchParams.set("pageSize", String(params.pageSize));
    if (params?.pageNumber != null)
      searchParams.set("pageNumber", String(params.pageNumber));

    const query = searchParams.toString();
    const endpoint = `/seller/products/v2/list${query ? `?${query}` : ""}`;
    const data = await this.fetch<SnapDealProductsResponse>(endpoint);
    if (!data) {
      return {
        products: [],
        totalCount: 0,
        pageNumber: params?.pageNumber ?? 1,
        pageSize: params?.pageSize ?? 50,
      };
    }
    return data;
  }
}
