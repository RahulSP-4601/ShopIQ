/**
 * Square API Client
 *
 * API Documentation: https://developer.squareup.com/reference/square
 * Base URL: https://connect.squareup.com/v2
 */

import { decryptToken } from "@/lib/shopify/oauth";

const SQUARE_API_BASE = "https://connect.squareup.com/v2";
const FETCH_TIMEOUT_MS = 30000;
const SQUARE_API_VERSION = "2024-01-18";

// ============================================
// INTERFACES
// ============================================

export interface SquareMerchant {
  id: string;
  business_name: string;
  country: string;
  language_code: string;
  currency: string;
  status: string;
  main_location_id: string;
  created_at: string;
}

export interface SquareLocation {
  id: string;
  name: string;
  address?: {
    address_line_1?: string;
    locality?: string;
    administrative_district_level_1?: string;
    postal_code?: string;
    country?: string;
  };
  timezone: string;
  capabilities: string[];
  status: string;
  created_at: string;
  merchant_id: string;
  country: string;
  language_code: string;
  currency: string;
  business_name: string;
}

export interface SquareOrder {
  id: string;
  location_id: string;
  reference_id?: string;
  source?: { name: string };
  customer_id?: string;
  line_items?: SquareOrderLineItem[];
  fulfillments?: SquareOrderFulfillment[];
  state: string;
  version: number;
  total_money: SquareMoney;
  total_tax_money: SquareMoney;
  total_discount_money: SquareMoney;
  total_tip_money: SquareMoney;
  total_service_charge_money: SquareMoney;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  tenders?: SquareTender[];
  refunds?: SquareRefund[];
  net_amounts?: {
    total_money: SquareMoney;
    tax_money: SquareMoney;
    discount_money: SquareMoney;
    tip_money: SquareMoney;
    service_charge_money: SquareMoney;
  };
}

export interface SquareOrderLineItem {
  uid: string;
  name: string;
  quantity: string;
  catalog_object_id?: string;
  variation_name?: string;
  note?: string;
  base_price_money: SquareMoney;
  total_money: SquareMoney;
  total_tax_money: SquareMoney;
  total_discount_money: SquareMoney;
}

export interface SquareOrderFulfillment {
  uid: string;
  type: string;
  state: string;
  pickup_details?: {
    recipient?: {
      display_name?: string;
      email_address?: string;
      phone_number?: string;
    };
  };
  shipment_details?: {
    recipient?: {
      display_name?: string;
      email_address?: string;
      phone_number?: string;
    };
  };
}

export interface SquareMoney {
  amount: number;
  currency: string;
}

export interface SquareTender {
  id: string;
  type: string;
  amount_money: SquareMoney;
}

export interface SquareRefund {
  id: string;
  status: string;
  amount_money: SquareMoney;
}

export interface SquareCatalogObject {
  type: string;
  id: string;
  updated_at: string;
  created_at: string;
  version: number;
  is_deleted: boolean;
  present_at_all_locations: boolean;
  present_at_location_ids?: string[];
  absent_at_location_ids?: string[];
  item_data?: SquareCatalogItem;
  item_variation_data?: SquareCatalogItemVariation;
  image_data?: SquareCatalogImage;
}

export interface SquareCatalogItem {
  name: string;
  description?: string;
  abbreviation?: string;
  category_id?: string;
  variations?: SquareCatalogObject[];
  product_type?: string;
  image_ids?: string[];
}

export interface SquareCatalogItemVariation {
  item_id: string;
  name: string;
  sku?: string;
  upc?: string;
  ordinal?: number;
  pricing_type: string;
  price_money?: SquareMoney;
  inventory_alert_type?: string;
  inventory_alert_threshold?: number;
  track_inventory?: boolean;
  sellable?: boolean;
  stockable?: boolean;
}

export interface SquareCatalogImage {
  name?: string;
  url?: string;
  caption?: string;
}

export interface SquareInventoryCount {
  catalog_object_id: string;
  catalog_object_type: string;
  state: string;
  location_id: string;
  quantity: string;
  calculated_at: string;
}

export interface SquareWebhookSubscription {
  id: string;
  enabled: boolean;
  event_types: string[];
  notification_url: string;
  api_version: string;
  signature_key: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// CLIENT CLASS
// ============================================

export class SquareClient {
  private accessToken: string;

  /**
   * Create a Square client
   * @param encryptedAccessToken - Encrypted access token
   * @param isEncrypted - Whether the token is encrypted (default true)
   */
  constructor(encryptedAccessToken: string, isEncrypted: boolean = true) {
    this.accessToken = isEncrypted
      ? decryptToken(encryptedAccessToken)
      : encryptedAccessToken;
  }

  /**
   * Make a request to the Square API
   */
  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T | null> {
    const url = `${SQUARE_API_BASE}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
          "Square-Version": SQUARE_API_VERSION,
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        // Truncate and strip potential PII from error response
        const truncated = errorText.length > 500 ? errorText.slice(0, 500) + "..." : errorText;
        const sanitizedError = truncated
          .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL_REDACTED]")
          .replace(/(?:\+?\d{1,4}[\s.-]?)?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{2,4}(?:[\s.-]?\d{1,4})?/g, (match) => {
            // Only redact if the match contains at least 7 digits total
            const digitCount = match.replace(/\D/g, "").length;
            return digitCount >= 7 ? "[PHONE_REDACTED]" : match;
          });
        throw new Error(`Square API error: ${response.status} - ${sanitizedError}`);
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
        throw new Error(`Square API returned invalid JSON for ${endpoint}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get merchant information
   */
  async getMerchant(): Promise<SquareMerchant | null> {
    const result = await this.fetch<{ merchant: SquareMerchant | SquareMerchant[] }>("/merchants/me");
    if (!result?.merchant) return null;
    // Square /merchants/me returns a single merchant object, but handle array for safety
    return Array.isArray(result.merchant) ? result.merchant[0] || null : result.merchant;
  }

  /**
   * List locations
   */
  async listLocations(): Promise<SquareLocation[]> {
    const result = await this.fetch<{ locations: SquareLocation[] }>("/locations");
    return result?.locations || [];
  }

  /**
   * Retrieve a single order by ID
   */
  async retrieveOrder(orderId: string): Promise<SquareOrder | null> {
    const result = await this.fetch<{ order: SquareOrder }>(
      `/orders/${encodeURIComponent(orderId)}`
    );
    return result?.order || null;
  }

  /**
   * Search orders
   */
  async searchOrders(params: {
    location_ids: string[];
    cursor?: string;
    limit?: number;
    start_at?: string;
    end_at?: string;
  }): Promise<{ orders: SquareOrder[]; cursor?: string }> {
    if (!params.location_ids || params.location_ids.length === 0) {
      return { orders: [] };
    }

    const body: Record<string, unknown> = {
      location_ids: params.location_ids,
      limit: params.limit || 50,
      return_entries: false,
    };

    if (params.cursor) {
      body.cursor = params.cursor;
    }

    if (params.start_at || params.end_at) {
      // Only include defined date fields to avoid sending undefined values to the API
      const updatedAt: Record<string, string> = {};
      if (params.start_at) updatedAt.start_at = params.start_at;
      if (params.end_at) updatedAt.end_at = params.end_at;

      body.query = {
        filter: {
          date_time_filter: {
            updated_at: updatedAt,
          },
        },
        sort: {
          sort_field: "UPDATED_AT",
          sort_order: "DESC",
        },
      };
    }

    const result = await this.fetch<{ orders: SquareOrder[]; cursor?: string }>(
      "/orders/search",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    return result || { orders: [] };
  }

  /**
   * List catalog items
   */
  async listCatalog(params?: {
    cursor?: string;
    types?: string[];
  }): Promise<{ objects: SquareCatalogObject[]; cursor?: string }> {
    const searchParams = new URLSearchParams();

    if (params?.cursor) searchParams.set("cursor", params.cursor);
    if (params?.types) searchParams.set("types", params.types.join(","));

    const query = searchParams.toString();
    const endpoint = query ? `/catalog/list?${query}` : "/catalog/list";

    const result = await this.fetch<{
      objects: SquareCatalogObject[];
      cursor?: string;
    }>(endpoint);

    return result || { objects: [] };
  }

  /**
   * Batch retrieve catalog objects (for images)
   */
  async batchRetrieveCatalogObjects(
    objectIds: string[]
  ): Promise<SquareCatalogObject[]> {
    if (objectIds.length === 0) return [];

    const result = await this.fetch<{
      objects: SquareCatalogObject[];
    }>("/catalog/batch-retrieve", {
      method: "POST",
      body: JSON.stringify({
        object_ids: objectIds,
        include_related_objects: true,
      }),
    });

    return result?.objects || [];
  }

  /**
   * Batch retrieve inventory counts
   */
  async batchRetrieveInventoryCounts(
    catalogObjectIds: string[],
    locationIds: string[]
  ): Promise<SquareInventoryCount[]> {
    // Validate both arrays are non-empty before making API call
    if (catalogObjectIds.length === 0) return [];
    if (locationIds.length === 0) return [];

    const result = await this.fetch<{
      counts: SquareInventoryCount[];
    }>("/inventory/counts/batch-retrieve", {
      method: "POST",
      body: JSON.stringify({
        catalog_object_ids: catalogObjectIds,
        location_ids: locationIds,
        states: ["IN_STOCK"],
      }),
    });

    return result?.counts || [];
  }

  /**
   * List webhook subscriptions
   */
  async listWebhookSubscriptions(): Promise<SquareWebhookSubscription[]> {
    const result = await this.fetch<{
      subscriptions: SquareWebhookSubscription[];
    }>("/webhooks/subscriptions");

    return result?.subscriptions || [];
  }

  /**
   * Create a webhook subscription
   */
  async createWebhookSubscription(params: {
    notification_url: string;
    event_types: string[];
    enabled?: boolean;
  }): Promise<SquareWebhookSubscription | null> {
    const result = await this.fetch<{
      subscription: SquareWebhookSubscription;
    }>("/webhooks/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        subscription: {
          name: "ShopIQ Webhook",
          enabled: params.enabled ?? true,
          event_types: params.event_types,
          notification_url: params.notification_url,
          api_version: SQUARE_API_VERSION,
        },
      }),
    });

    return result?.subscription || null;
  }

  /**
   * Delete a webhook subscription
   */
  async deleteWebhookSubscription(subscriptionId: string): Promise<void> {
    await this.fetch(`/webhooks/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      method: "DELETE",
    });
  }
}
