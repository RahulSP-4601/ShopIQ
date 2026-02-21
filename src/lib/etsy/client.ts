import { decryptToken } from "@/lib/shopify/oauth";

const ETSY_API_BASE = "https://api.etsy.com/v3";
const FETCH_TIMEOUT_MS = 30000;

export interface EtsyUserInfo {
  userId: number;
  loginName: string;
}

export interface EtsyShop {
  shopId: number;
  shopName: string;
  userId: number;
  currencyCode: string;
  url: string;
  listingActiveCount: number;
}

export interface EtsyReceipt {
  receiptId: number;
  orderId: number;
  status: string;
  /**
   * PII: Buyer email address - handle with care per GDPR/CCPA requirements.
   * Do not log in plain text. Use masking/hashing for any logging purposes.
   * Ensure proper access controls when persisting or returning in API responses.
   */
  buyerEmail: string;
  grandtotal: { amount: number; divisor: number; currency_code: string };
  transactions: EtsyTransaction[];
  createTimestamp: number;
  updateTimestamp: number;
}

export interface EtsyTransaction {
  transactionId: number;
  title: string;
  quantity: number;
  price: { amount: number; divisor: number; currency_code: string };
  listingId: number;
  sku: string;
}

export interface EtsyReceiptsResponse {
  count: number;
  results: EtsyReceipt[];
}

export interface EtsyListing {
  listingId: number;
  title: string;
  description: string;
  state: string;
  price: { amount: number; divisor: number; currency_code: string };
  quantity: number;
  tags: string[];
  url: string;
  views: number;
  numFavorers: number;
}

export interface EtsyListingsResponse {
  count: number;
  results: EtsyListing[];
}

export class EtsyClient {
  private accessToken: string;
  private apiKey: string;

  /**
   * Create an Etsy client
   * @param accessTokenOrEncrypted - Access token (plaintext or encrypted)
   * @param isEncrypted - Whether the token is encrypted (default true)
   */
  constructor(accessTokenOrEncrypted: string, isEncrypted: boolean = true) {
    // Validate inputs
    if (!accessTokenOrEncrypted || typeof accessTokenOrEncrypted !== "string") {
      throw new Error("EtsyClient: accessToken is required and must be a non-empty string");
    }

    // Validate API key exists
    const apiKey = process.env.ETSY_API_KEY;
    if (!apiKey) {
      throw new Error("EtsyClient: ETSY_API_KEY environment variable is not set");
    }
    this.apiKey = apiKey;

    if (isEncrypted) {
      try {
        this.accessToken = decryptToken(accessTokenOrEncrypted);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        throw new Error(
          `EtsyClient: Failed to decrypt access token. ` +
          `Token may be corrupted or encrypted with a different key. Details: ${message}`
        );
      }
    } else {
      this.accessToken = accessTokenOrEncrypted;
    }

    // Validate decrypted/provided token is non-empty
    if (!this.accessToken || this.accessToken.trim() === "") {
      throw new Error("EtsyClient: access token resolved to an empty string");
    }
  }

  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T | null> {
    let url: string;
    if (endpoint.startsWith("http")) {
      // Validate that full URLs only point to Etsy domains to prevent leaking auth headers
      const parsed = new URL(endpoint);
      if (parsed.hostname !== "etsy.com" && !parsed.hostname.endsWith(".etsy.com")) {
        throw new Error(
          `EtsyClient: Refusing to send authenticated request to non-Etsy host "${parsed.hostname}"`
        );
      }
      url = endpoint;
    } else {
      url = `${ETSY_API_BASE}${endpoint}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      let response: Response;
      try {
        response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            ...options?.headers,
            Authorization: `Bearer ${this.accessToken}`,
            "x-api-key": this.apiKey,
          },
        });
      } catch (fetchError) {
        // Surface a clear timeout message instead of generic AbortError
        if (
          controller.signal.aborted ||
          (fetchError instanceof Error && fetchError.name === "AbortError")
        ) {
          throw new Error(
            `Etsy API request to ${endpoint} timed out after ${FETCH_TIMEOUT_MS}ms`
          );
        }
        throw fetchError;
      }

      if (!response.ok) {
        let errorBody: string;
        try {
          errorBody = await response.text();
        } catch {
          errorBody = response.statusText || "Unable to read response body";
        }
        throw new Error(`Etsy API error: ${response.status} - ${errorBody}`);
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
          `Etsy API returned invalid JSON for ${endpoint} (status ${response.status})`
        );
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetch authenticated user's info.
   * Used during OAuth callback to get externalId and externalName.
   */
  async getUserInfo(): Promise<EtsyUserInfo> {
    const data = await this.fetch<{
      user_id: number;
      login_name: string;
    }>("/application/users/me");

    if (!data) {
      throw new Error("Etsy user API returned an empty response");
    }

    return {
      userId: data.user_id,
      loginName: data.login_name,
    };
  }

  /**
   * Fetch the user's shop info.
   */
  async getShop(userId: number): Promise<EtsyShop | null> {
    const data = await this.fetch<{
      count: number;
      results: Array<{
        shop_id: number;
        shop_name: string;
        user_id: number;
        currency_code: string;
        url: string;
        listing_active_count: number;
      }>;
    }>(`/application/users/${userId}/shops`);

    if (!data || !data.results || data.results.length === 0) {
      return null;
    }

    const shop = data.results[0];
    return {
      shopId: shop.shop_id,
      shopName: shop.shop_name,
      userId: shop.user_id,
      currencyCode: shop.currency_code,
      url: shop.url,
      listingActiveCount: shop.listing_active_count,
    };
  }

  /**
   * Fetch shop receipts (orders).
   * Maps snake_case API response to camelCase EtsyReceipt interface.
   */
  async getReceipts(
    shopId: number,
    params?: { limit?: number; offset?: number; defaultCurrency?: string }
  ): Promise<EtsyReceiptsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit != null) searchParams.set("limit", String(params.limit));
    if (params?.offset != null) searchParams.set("offset", String(params.offset));

    const query = searchParams.toString();
    const endpoint = `/application/shops/${shopId}/receipts${query ? `?${query}` : ""}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await this.fetch<{ count: number; results: any[] }>(endpoint);
    if (!data) {
      return { count: 0, results: [] };
    }

    // Map snake_case API response to camelCase EtsyReceipt
    const mappedResults: EtsyReceipt[] = data.results.map((r) => {
      // Safe fallback for grandtotal — prevents null/undefined references in transaction mapping
      const safeGrandtotal = r.grandtotal ?? { amount: 0, divisor: 100, currency_code: params?.defaultCurrency || "" };
      return {
        receiptId: r.receipt_id ?? r.receiptId,
        orderId: r.order_id ?? r.orderId,
        status: r.status,
        buyerEmail: r.buyer_email ?? r.buyerEmail ?? "",
        grandtotal: safeGrandtotal,
        transactions: (r.transactions ?? []).map((t: Record<string, unknown>) => ({
          transactionId: t.transaction_id ?? t.transactionId,
          title: t.title ?? "",
          quantity: t.quantity ?? 1,
          price: t.price ?? { amount: 0, divisor: 100, currency_code: safeGrandtotal.currency_code || params?.defaultCurrency || "" },
          listingId: t.listing_id ?? t.listingId,
          sku: t.sku ?? "",
        })),
        createTimestamp: r.create_timestamp ?? r.createTimestamp ?? 0,
        updateTimestamp: r.update_timestamp ?? r.updateTimestamp ?? 0,
      };
    });

    return { count: data.count, results: mappedResults };
  }

  /**
   * Fetch active listings for a shop.
   * Maps snake_case API response to camelCase EtsyListing interface.
   */
  async getListings(
    shopId: number,
    params?: { limit?: number; offset?: number; defaultCurrency?: string }
  ): Promise<EtsyListingsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit != null) searchParams.set("limit", String(params.limit));
    if (params?.offset != null) searchParams.set("offset", String(params.offset));

    const query = searchParams.toString();
    const endpoint = `/application/shops/${shopId}/listings/active${query ? `?${query}` : ""}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await this.fetch<{ count: number; results: any[] }>(endpoint);
    if (!data) {
      return { count: 0, results: [] };
    }

    // Map snake_case API response to camelCase EtsyListing
    const mappedResults: EtsyListing[] = data.results.map((l) => ({
      listingId: l.listing_id ?? l.listingId,
      title: l.title ?? "",
      description: l.description ?? "",
      state: l.state ?? "",
      price: l.price ?? { amount: 0, divisor: 100, currency_code: params?.defaultCurrency || "" },
      quantity: l.quantity ?? 0,
      tags: l.tags ?? [],
      url: l.url ?? "",
      views: l.views ?? 0,
      numFavorers: l.num_favorers ?? l.numFavorers ?? 0,
    }));

    return { count: data.count, results: mappedResults };
  }
}
