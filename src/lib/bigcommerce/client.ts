/**
 * BigCommerce API Client
 *
 * API Documentation: https://developer.bigcommerce.com/docs/rest-management
 * Base URL: https://api.bigcommerce.com/stores/{store_hash}
 */

import { decryptToken } from "@/lib/shopify/oauth";

const BIGCOMMERCE_API_BASE = "https://api.bigcommerce.com/stores";
const FETCH_TIMEOUT_MS = 30000;

// ============================================
// INTERFACES
// ============================================

export interface BigCommerceOrder {
  id: number;
  customer_id: number;
  date_created: string;
  date_modified: string;
  date_shipped: string;
  status_id: number;
  status: string;
  subtotal_ex_tax: string;
  subtotal_inc_tax: string;
  subtotal_tax: string;
  base_shipping_cost: string;
  shipping_cost_ex_tax: string;
  shipping_cost_inc_tax: string;
  shipping_cost_tax: string;
  shipping_cost_tax_class_id: number;
  base_handling_cost: string;
  handling_cost_ex_tax: string;
  handling_cost_inc_tax: string;
  handling_cost_tax: string;
  handling_cost_tax_class_id: number;
  base_wrapping_cost: string;
  wrapping_cost_ex_tax: string;
  wrapping_cost_inc_tax: string;
  wrapping_cost_tax: string;
  wrapping_cost_tax_class_id: number;
  total_ex_tax: string;
  total_inc_tax: string;
  total_tax: string;
  items_total: number;
  items_shipped: number;
  payment_method: string;
  payment_provider_id: string | null;
  payment_status: string;
  refunded_amount: string;
  order_is_digital: boolean;
  store_credit_amount: string;
  gift_certificate_amount: string;
  ip_address: string;
  ip_address_v6: string;
  geoip_country: string;
  geoip_country_iso2: string;
  currency_id: number;
  currency_code: string;
  currency_exchange_rate: string;
  default_currency_id: number;
  default_currency_code: string;
  staff_notes: string;
  customer_message: string;
  discount_amount: string;
  coupon_discount: string;
  shipping_address_count: number;
  is_deleted: boolean;
  ebay_order_id: string;
  cart_id: string;
  billing_address: BigCommerceAddress;
  is_email_opt_in: boolean;
  credit_card_type: string | null;
  order_source: string;
  channel_id: number;
  external_source: string | null;
  products: { url: string };
  shipping_addresses: { url: string };
  coupons: { url: string };
}

export interface BigCommerceAddress {
  first_name: string;
  last_name: string;
  company: string;
  street_1: string;
  street_2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  country_iso2: string;
  phone: string;
  email: string;
  form_fields: Array<{ name: string; value: string }>;
}

export interface BigCommerceOrderProduct {
  id: number;
  order_id: number;
  product_id: number;
  order_address_id: number;
  name: string;
  name_customer: string;
  name_merchant: string;
  sku: string;
  upc: string;
  type: string;
  base_price: string;
  price_ex_tax: string;
  price_inc_tax: string;
  price_tax: string;
  base_total: string;
  total_ex_tax: string;
  total_inc_tax: string;
  total_tax: string;
  weight: string;
  width: string;
  height: string;
  depth: string;
  quantity: number;
  base_cost_price: string;
  cost_price_inc_tax: string;
  cost_price_ex_tax: string;
  cost_price_tax: string;
  is_refunded: boolean;
  quantity_refunded: number;
  refund_amount: string;
  return_id: number;
  wrapping_id: number;
  wrapping_name: string;
  base_wrapping_cost: string;
  wrapping_cost_ex_tax: string;
  wrapping_cost_inc_tax: string;
  wrapping_cost_tax: string;
  wrapping_message: string;
  quantity_shipped: number;
  event_name: string | null;
  event_date: string;
  fixed_shipping_cost: string;
  ebay_item_id: string;
  ebay_transaction_id: string;
  option_set_id: number | null;
  parent_order_product_id: number | null;
  is_bundled_product: boolean;
  bin_picking_number: string;
  external_id: string | null;
  fulfillment_source: string;
  brand: string;
}

export interface BigCommerceProduct {
  id: number;
  name: string;
  type: string;
  sku: string;
  description: string;
  weight: number;
  width: number;
  depth: number;
  height: number;
  price: number;
  cost_price: number;
  retail_price: number;
  sale_price: number;
  map_price: number;
  tax_class_id: number;
  product_tax_code: string;
  calculated_price: number;
  categories: number[];
  brand_id: number;
  option_set_id: number | null;
  option_set_display: string;
  inventory_level: number;
  inventory_warning_level: number;
  inventory_tracking: string;
  reviews_rating_sum: number;
  reviews_count: number;
  total_sold: number;
  fixed_cost_shipping_price: number;
  is_free_shipping: boolean;
  is_visible: boolean;
  is_featured: boolean;
  related_products: number[];
  warranty: string;
  bin_picking_number: string;
  layout_file: string;
  upc: string;
  mpn: string;
  gtin: string;
  date_created: string;
  date_modified: string;
  search_keywords: string;
  availability: string;
  availability_description: string;
  gift_wrapping_options_type: string;
  gift_wrapping_options_list: number[];
  sort_order: number;
  condition: string;
  is_condition_shown: boolean;
  order_quantity_minimum: number;
  order_quantity_maximum: number;
  page_title: string;
  meta_keywords: string[];
  meta_description: string;
  view_count: number;
  preorder_release_date: string | null;
  preorder_message: string;
  is_preorder_only: boolean;
  is_price_hidden: boolean;
  price_hidden_label: string;
  custom_url: { url: string; is_customized: boolean };
  base_variant_id: number | null;
  open_graph_type: string;
  open_graph_title: string;
  open_graph_description: string;
  open_graph_use_meta_description: boolean;
  open_graph_use_product_name: boolean;
  open_graph_use_image: boolean;
  images?: BigCommerceImage[];
}

export interface BigCommerceImage {
  id: number;
  product_id: number;
  is_thumbnail: boolean;
  sort_order: number;
  description: string;
  image_file: string;
  url_zoom: string;
  url_standard: string;
  url_thumbnail: string;
  url_tiny: string;
  date_modified: string;
}

export interface BigCommerceStore {
  id: string;
  domain: string;
  secure_url: string;
  control_panel_base_url: string;
  name: string;
  first_name: string;
  last_name: string;
  address: string;
  country: string;
  country_code: string;
  phone: string;
  admin_email: string;
  order_email: string;
  favicon_url: string;
  timezone: { name: string; raw_offset: number; dst_offset: number; dst_correction: boolean };
  language: string;
  currency: string;
  currency_symbol: string;
  decimal_separator: string;
  thousands_separator: string;
  decimal_places: number;
  currency_symbol_location: string;
  weight_units: string;
  dimension_units: string;
  dimension_decimal_places: number;
  dimension_decimal_token: string;
  dimension_thousands_token: string;
  plan_name: string;
  plan_level: string;
  plan_is_trial: boolean;
  industry: string;
  logo: { url: string };
  is_price_entered_with_tax: boolean;
  active_comparison_modules: string[];
  features: {
    stencil_enabled: boolean;
    sitewidehttps_enabled: boolean;
    facebook_catalog_id: string;
    checkout_type: string;
  };
}

export interface BigCommerceWebhook {
  id: number;
  client_id: string;
  store_hash: string;
  scope: string;
  destination: string;
  headers: Record<string, string>;
  is_active: boolean;
  created_at: number;
  updated_at: number;
}

// ============================================
// CLIENT CLASS
// ============================================

export class BigCommerceClient {
  private storeHash: string;
  private accessToken: string;

  /**
   * Create a BigCommerce client
   * @param storeHash - The BigCommerce store hash
   * @param encryptedAccessToken - Encrypted access token
   * @param isEncrypted - Whether the token is encrypted (default true)
   */
  constructor(
    storeHash: string,
    encryptedAccessToken: string,
    isEncrypted: boolean = true
  ) {
    // Validate inputs
    if (!storeHash || typeof storeHash !== "string") {
      throw new Error("BigCommerceClient: storeHash is required and must be a non-empty string");
    }
    if (!encryptedAccessToken || typeof encryptedAccessToken !== "string") {
      throw new Error("BigCommerceClient: encryptedAccessToken is required and must be a non-empty string");
    }

    this.storeHash = storeHash;

    if (isEncrypted) {
      try {
        this.accessToken = decryptToken(encryptedAccessToken);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        throw new Error(
          `BigCommerceClient: Failed to decrypt access token for store ${storeHash}. ` +
          `Token may be corrupted or encrypted with a different key. Details: ${message}`
        );
      }
    } else {
      this.accessToken = encryptedAccessToken;
    }
  }

  /**
   * Make a request to the BigCommerce API
   */
  private async fetch<T>(
    endpoint: string,
    version: "v2" | "v3" = "v3",
    options?: RequestInit
  ): Promise<T | null> {
    const url = `${BIGCOMMERCE_API_BASE}/${this.storeHash}/${version}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    // Merge caller's abort signal with our timeout signal
    // so that both timeout and caller cancellation work
    const callerSignal = options?.signal;
    if (callerSignal) {
      if (callerSignal.aborted) {
        controller.abort(callerSignal.reason);
      } else {
        const onCallerAbort = () => controller.abort(callerSignal.reason);
        callerSignal.addEventListener("abort", onCallerAbort, { once: true });
        // Clean up listener when our controller aborts (timeout or otherwise)
        controller.signal.addEventListener("abort", () => {
          callerSignal.removeEventListener("abort", onCallerAbort);
        }, { once: true });
      }
    }

    try {
      let response: Response;
      try {
        // Use our merged controller.signal (not options.signal) for the actual fetch
        const { signal: _callerSignal, ...restOptions } = options || {};
        response = await fetch(url, {
          ...restOptions,
          signal: controller.signal,
          headers: {
            "X-Auth-Token": this.accessToken,
            "Content-Type": "application/json",
            Accept: "application/json",
            ...options?.headers,
          },
        });
      } catch (fetchError) {
        // Runtime-agnostic abort detection (works in Node.js and browsers)
        if (
          fetchError instanceof Error &&
          (fetchError.name === "AbortError" ||
            ("code" in fetchError && (fetchError as NodeJS.ErrnoException).code === "ABORT_ERR") ||
            fetchError.message?.includes("aborted"))
        ) {
          // Distinguish caller-initiated abort from internal timeout
          if (callerSignal?.aborted) {
            throw new Error(`BigCommerce API request cancelled by caller for ${endpoint}`);
          }
          throw new Error(`BigCommerce API request timed out after ${FETCH_TIMEOUT_MS}ms for ${endpoint}`);
        }
        throw fetchError;
      }

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`BigCommerce API error: ${response.status} - ${error}`);
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
        throw new Error(`BigCommerce API returned invalid JSON for ${endpoint}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get store information
   */
  async getStoreInfo(): Promise<BigCommerceStore | null> {
    return this.fetch<BigCommerceStore>("/store", "v2");
  }

  /**
   * Get orders (v2 API for full order data)
   */
  async getOrders(params?: {
    page?: number;
    limit?: number;
    min_date_modified?: string;
  }): Promise<BigCommerceOrder[]> {
    const searchParams = new URLSearchParams();

    if (params?.page !== undefined) searchParams.set("page", String(params.page));
    if (params?.limit !== undefined) searchParams.set("limit", String(params.limit));
    if (params?.min_date_modified) {
      searchParams.set("min_date_modified", params.min_date_modified);
    }

    const query = searchParams.toString();
    const endpoint = query ? `/orders?${query}` : "/orders";

    const result = await this.fetch<BigCommerceOrder[]>(endpoint, "v2");
    return result || [];
  }

  /**
   * Get a single order by ID (v2 API)
   */
  async getOrder(orderId: number): Promise<BigCommerceOrder | null> {
    return this.fetch<BigCommerceOrder>(`/orders/${orderId}`, "v2");
  }

  /**
   * Get order products (line items)
   */
  async getOrderProducts(orderId: number): Promise<BigCommerceOrderProduct[]> {
    const result = await this.fetch<BigCommerceOrderProduct[]>(
      `/orders/${orderId}/products`,
      "v2"
    );
    return result || [];
  }

  /**
   * Get a single product by ID (v3 API)
   */
  async getProduct(
    productId: number,
    params?: { include?: string }
  ): Promise<BigCommerceProduct | null> {
    const searchParams = new URLSearchParams();
    if (params?.include) searchParams.set("include", params.include);

    const query = searchParams.toString();
    const endpoint = query
      ? `/catalog/products/${productId}?${query}`
      : `/catalog/products/${productId}`;

    const result = await this.fetch<{ data: BigCommerceProduct }>(endpoint, "v3");
    return result?.data || null;
  }

  /**
   * Get products (v3 API)
   */
  async getProducts(params?: {
    page?: number;
    limit?: number;
    include?: string;
  }): Promise<{ data: BigCommerceProduct[]; meta: { pagination: { total: number; count: number; per_page: number; current_page: number; total_pages: number } } }> {
    const searchParams = new URLSearchParams();

    if (params?.page !== undefined) searchParams.set("page", String(params.page));
    if (params?.limit !== undefined) searchParams.set("limit", String(params.limit));
    if (params?.include) searchParams.set("include", params.include);

    const query = searchParams.toString();
    const endpoint = query ? `/catalog/products?${query}` : "/catalog/products";

    const result = await this.fetch<{
      data: BigCommerceProduct[];
      meta: { pagination: { total: number; count: number; per_page: number; current_page: number; total_pages: number } };
    }>(endpoint, "v3");

    const requestedPerPage = params?.limit ?? 50;
    return result || { data: [], meta: { pagination: { total: 0, count: 0, per_page: requestedPerPage, current_page: 1, total_pages: 0 } } };
  }

  /**
   * Get webhooks
   */
  async getWebhooks(): Promise<{ data: BigCommerceWebhook[] }> {
    const result = await this.fetch<{ data: BigCommerceWebhook[] }>("/hooks", "v3");
    return result || { data: [] };
  }

  /**
   * Create a webhook
   */
  async createWebhook(webhook: {
    scope: string;
    destination: string;
    is_active?: boolean;
    headers?: Record<string, string>;
  }): Promise<{ data: BigCommerceWebhook } | null> {
    return this.fetch<{ data: BigCommerceWebhook }>("/hooks", "v3", {
      method: "POST",
      body: JSON.stringify({
        ...webhook,
        is_active: webhook.is_active ?? true,
      }),
    });
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: number): Promise<void> {
    await this.fetch(`/hooks/${webhookId}`, "v3", {
      method: "DELETE",
    });
  }
}
