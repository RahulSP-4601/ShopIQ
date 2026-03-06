import { decryptToken } from "@/lib/shopify/oauth";
import { resolveAndValidateHost } from "@/lib/prestashop/types";

const FETCH_TIMEOUT_MS = 30000;

// PrestaShop API response types

export interface PrestaShopOrderRow {
  id: number;
  product_id: string;
  product_name: string;
  product_quantity: string;
  unit_price_tax_incl: string;
  product_reference: string;
}

export interface PrestaShopOrder {
  id: number;
  reference: string;
  current_state: string; // State ID as string
  total_paid_tax_incl: string;
  total_paid: string;
  id_currency: string;
  date_add: string;
  date_upd: string;
  id_customer: string;
  associations?: {
    order_rows?: PrestaShopOrderRow[];
  };
}

export interface PrestaShopProduct {
  id: number;
  name: string | Array<{ id: string; value: string }>; // Multilang
  reference: string;
  price: string;
  id_category_default: string;
  active: string; // "0" or "1"
  quantity?: number; // May come from stock_availables
  id_default_image?: string;
}

export interface PrestaShopOrderState {
  id: number;
  name: string | Array<{ id: string; value: string }>;
}

export interface PrestaShopShopInfo {
  shopName: string;
}

export class PrestaShopClient {
  private apiKey: string;
  private storeUrl: string;

  constructor(
    encryptedApiKey: string,
    storeUrl: string,
    isEncrypted: boolean = true
  ) {
    this.apiKey = isEncrypted
      ? decryptToken(encryptedApiKey)
      : encryptedApiKey;
    // Strip trailing slashes to prevent double-slash in API paths
    this.storeUrl = storeUrl.replace(/\/+$/, "");
  }

  private async fetch<T>(
    endpoint: string,
    extraParams?: Record<string, string>
  ): Promise<T | null> {
    // Build URL with output_format=JSON
    const url = new URL(`${this.storeUrl}/api/${endpoint}`);
    url.searchParams.set("output_format", "JSON");

    if (extraParams) {
      for (const [key, value] of Object.entries(extraParams)) {
        url.searchParams.set(key, value);
      }
    }

    // DNS rebinding protection: resolve and validate IPs, then connect to the
    // validated address directly so a later re-resolution can't redirect us.
    const validatedIps = await resolveAndValidateHost(url.hostname);
    const originalHostname = url.hostname;
    // Pin to the first validated IP to avoid TOCTOU re-resolution
    url.hostname = validatedIps[0];

    // HTTP Basic Auth: API key as username, empty password
    const authHeader = `Basic ${Buffer.from(`${this.apiKey}:`).toString("base64")}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          Authorization: authHeader,
          Accept: "application/json",
          Host: originalHostname,
        },
      });

      if (response.status === 401) {
        throw new Error("PrestaShop API: Invalid API key (401 Unauthorized)");
      }

      if (response.status === 404) {
        // Resource not found — return null (e.g. no orders yet)
        return null;
      }

      if (!response.ok) {
        throw new Error(
          `PrestaShop API error: ${response.status} ${response.statusText} for ${endpoint}`
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
          `PrestaShop API returned invalid JSON for ${endpoint} (status ${response.status})`
        );
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(
          `PrestaShop API request timed out after ${FETCH_TIMEOUT_MS}ms for ${endpoint}`
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetch the shop's default currency ID from PS_CURRENCY_DEFAULT configuration.
   * Returns null if the configuration is missing or inaccessible.
   */
  async getDefaultCurrencyId(): Promise<string | null> {
    try {
      const data = await this.fetch<{
        configurations:
          | Array<{ id: number; name: string; value: string }>
          | { id: number; name: string; value: string };
      }>("configurations", {
        "filter[name]": "PS_CURRENCY_DEFAULT",
        display: "full",
      });

      if (!data || !data.configurations) return null;

      const configs = Array.isArray(data.configurations)
        ? data.configurations
        : [data.configurations];

      const currencyConfig = configs.find(
        (c) => c.name === "PS_CURRENCY_DEFAULT"
      );
      if (currencyConfig?.value) {
        return currencyConfig.value;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch shop information to verify connection and get store name.
   */
  async getShopInfo(): Promise<PrestaShopShopInfo> {
    // PrestaShop /api/shop returns shop configuration
    const data = await this.fetch<{ shop: { name: string } }>("shop");
    if (!data || !data.shop) {
      // Fallback: try /api/ root which lists available resources
      // If that works, the connection is valid even if /shop is restricted
      const root = await this.fetch<Record<string, unknown>>("");
      if (!root) {
        throw new Error("PrestaShop API returned an empty response");
      }
      return { shopName: "PrestaShop Store" };
    }
    return { shopName: data.shop.name || "PrestaShop Store" };
  }

  /**
   * Fetch orders with pagination.
   * PrestaShop uses limit=offset,count format.
   */
  async getOrders(params: {
    limit: number;
    offset: number;
    dateFrom?: string;
  }): Promise<PrestaShopOrder[]> {
    const extraParams: Record<string, string> = {
      display: "full",
      limit: `${params.offset},${params.limit}`,
      sort: "[date_add_ASC]",
    };

    // Incremental sync: filter by date_upd
    if (params.dateFrom) {
      extraParams["filter[date_upd]"] = `[${params.dateFrom},9999-12-31 23:59:59]`;
    }

    const data = await this.fetch<{ orders: PrestaShopOrder[] | PrestaShopOrder }>(
      "orders",
      extraParams
    );

    if (!data || !data.orders) {
      return [];
    }

    // PrestaShop returns a single object instead of array when there's only one result
    if (Array.isArray(data.orders)) {
      return data.orders;
    }
    return [data.orders];
  }

  /**
   * Fetch products with pagination.
   */
  async getProducts(params: {
    limit: number;
    offset: number;
  }): Promise<PrestaShopProduct[]> {
    const extraParams: Record<string, string> = {
      display: "full",
      limit: `${params.offset},${params.limit}`,
    };

    const data = await this.fetch<{ products: PrestaShopProduct[] | PrestaShopProduct }>(
      "products",
      extraParams
    );

    if (!data || !data.products) {
      return [];
    }

    // PrestaShop returns a single object instead of array when there's only one result
    if (Array.isArray(data.products)) {
      return data.products;
    }
    return [data.products];
  }

  /**
   * Fetch a currency ISO code by its PrestaShop currency ID.
   * Returns null if the currency cannot be resolved.
   */
  async getCurrencyIsoById(currencyId: string | number): Promise<string | null> {
    const id = String(currencyId);
    if (!id || id === "0") return null;

    try {
      const data = await this.fetch<{
        currency: { iso_code: string } | undefined;
      }>(`currencies/${id}`);

      if (data?.currency?.iso_code) {
        return data.currency.iso_code.toUpperCase();
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch stock available for a specific product to get quantity.
   */
  async getStockAvailable(productId: number): Promise<number> {
    const data = await this.fetch<{
      stock_availables: Array<{ quantity: string }> | { quantity: string };
    }>("stock_availables", {
      "filter[id_product]": String(productId),
      display: "full",
    });

    if (!data || !data.stock_availables) {
      return 0;
    }

    const stocks = Array.isArray(data.stock_availables)
      ? data.stock_availables
      : [data.stock_availables];

    // Sum all stock entries for this product (could have multiple warehouses)
    let total = 0;
    for (const stock of stocks) {
      const qty = parseInt(stock.quantity, 10);
      if (!isNaN(qty)) {
        total += qty;
      }
    }
    return total;
  }
}

/**
 * Extract a plain string from PrestaShop's multilang name field.
 * PrestaShop returns either a plain string or an array of { id, value } objects.
 */
export function extractName(
  name: string | Array<{ id: string; value: string }> | undefined
): string {
  if (!name) return "";
  if (typeof name === "string") return name;
  if (Array.isArray(name) && name.length > 0) {
    return name[0].value || "";
  }
  return "";
}
