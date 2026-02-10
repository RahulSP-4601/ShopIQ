/**
 * Validate that a domain is a legitimate Shopify myshopify.com hostname.
 * Prevents SSRF by rejecting arbitrary hostnames.
 * Shared by ShopifyClient constructor and webhook registration/deregistration.
 */
export function isValidShopifyDomain(domain: string): boolean {
  return /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.myshopify\.com$/.test(
    domain.toLowerCase()
  );
}
