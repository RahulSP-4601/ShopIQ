import { UnifiedOrderStatus, UnifiedProductStatus } from "@prisma/client";

export interface SyncResult {
  ordersSynced: number;
  productsSynced: number;
  errors: string[];
}

// ============================================
// ORDER STATUS MAPPING
// ============================================

export function mapShopifyOrderStatus(
  fulfillmentStatus: string | null
): UnifiedOrderStatus {
  switch (fulfillmentStatus) {
    case "fulfilled":
      return "DELIVERED";
    case "partial":
      return "SHIPPED";
    case "cancelled":
      return "CANCELLED";
    case null:
    case "unfulfilled":
    default:
      return "PENDING";
  }
}

export function mapEbayOrderStatus(
  fulfillmentStatus: string
): UnifiedOrderStatus {
  switch (fulfillmentStatus) {
    case "FULFILLED":
      return "DELIVERED";
    case "IN_PROGRESS":
      return "SHIPPED";
    case "CANCELLED":
      return "CANCELLED";
    case "RETURNED":
      return "RETURNED";
    case "NOT_STARTED":
    default:
      return "PENDING";
  }
}

export function mapEtsyOrderStatus(status: string): UnifiedOrderStatus {
  switch (status) {
    case "completed":
      return "DELIVERED";
    case "paid":
      return "CONFIRMED";
    case "canceled":
      return "CANCELLED";
    case "open":
    default:
      return "PENDING";
  }
}

export function mapFlipkartOrderStatus(status: string): UnifiedOrderStatus {
  switch (status) {
    case "DELIVERED":
      return "DELIVERED";
    case "SHIPPED":
      return "SHIPPED";
    case "APPROVED":
    case "PACKED":
      return "CONFIRMED";
    case "CANCELLED":
      return "CANCELLED";
    case "RETURN_REQUESTED": // Intermediate state: return initiated but not yet completed
      return "PENDING";
    case "RETURNED":
      return "RETURNED";
    default:
      return "PENDING";
  }
}

// ============================================
// PRODUCT STATUS MAPPING
// ============================================

export function mapEtsyProductStatus(state: string): UnifiedProductStatus {
  switch (state) {
    case "active":
      return "ACTIVE";
    case "sold_out":
      return "OUT_OF_STOCK";
    case "inactive":
    case "expired":
    case "removed":
    default:
      return "INACTIVE";
  }
}

// ============================================
// BIGCOMMERCE STATUS MAPPING
// ============================================

/**
 * BigCommerce order status IDs:
 * 0 = Incomplete, 1 = Pending, 2 = Shipped, 3 = Partially Shipped,
 * 4 = Refunded, 5 = Cancelled, 6 = Declined, 7 = Awaiting Payment,
 * 8 = Awaiting Pickup, 9 = Awaiting Shipment, 10 = Completed,
 * 11 = Awaiting Fulfillment, 12 = Manual Verification Required,
 * 13 = Disputed, 14 = Partially Refunded
 */
export function mapBigCommerceOrderStatus(
  statusId: number
): UnifiedOrderStatus {
  switch (statusId) {
    case 10: // Completed
      return "DELIVERED";
    case 2: // Shipped
    case 3: // Partially Shipped
    case 8: // Awaiting Pickup
      return "SHIPPED";
    case 9: // Awaiting Shipment
    case 11: // Awaiting Fulfillment
      return "CONFIRMED";
    case 4: // Refunded → no REFUNDED enum, closest is CANCELLED
      return "CANCELLED";
    case 14: // Partially Refunded → order still delivered, partial refund doesn't change fulfillment
      return "DELIVERED";
    case 5: // Cancelled
    case 6: // Declined
      return "CANCELLED";
    case 0: // Incomplete
    case 1: // Pending
    case 7: // Awaiting Payment
    case 12: // Manual Verification Required
    case 13: // Disputed
    default:
      return "PENDING";
  }
}

export function mapBigCommerceProductStatus(
  isVisible: boolean,
  inventoryLevel: number
): UnifiedProductStatus {
  if (!isVisible) {
    return "INACTIVE";
  }
  if (inventoryLevel <= 0) {
    return "OUT_OF_STOCK";
  }
  return "ACTIVE";
}

// ============================================
// SQUARE STATUS MAPPING
// ============================================

export function mapSquareOrderStatus(state: string): UnifiedOrderStatus {
  switch (state) {
    case "COMPLETED":
      return "DELIVERED";
    case "CANCELED":
      return "CANCELLED";
    case "OPEN":
    case "DRAFT":
    default:
      return "PENDING";
  }
}

export function mapSquareCatalogStatus(
  isDeleted: boolean,
  inventoryCount?: number
): UnifiedProductStatus {
  if (isDeleted) {
    return "INACTIVE";
  }
  if (inventoryCount !== undefined && inventoryCount <= 0) {
    return "OUT_OF_STOCK";
  }
  return "ACTIVE";
}

// ============================================
// SNAPDEAL STATUS MAPPING
// ============================================

/**
 * SnapDeal order statuses:
 * PFF = Pending For Fulfilment
 * PRNT = Print (ready for packing)
 * SHIPPED = In transit
 * DELIVERED = Delivered to customer
 * CANCELLED = Cancelled
 */
export function mapSnapDealOrderStatus(status: string): UnifiedOrderStatus {
  switch (status) {
    case "DELIVERED":
      return "DELIVERED";
    case "SHIPPED":
    case "IN_TRANSIT":
      return "SHIPPED";
    case "APPROVED":
    case "PACKED":
      return "CONFIRMED";
    case "CANCELLED":
      return "CANCELLED";
    case "RETURNED":
      return "RETURNED";
    case "PFF":
    case "PRNT":
    default:
      return "PENDING";
  }
}

export function mapSnapDealProductStatus(
  status: string,
  inventory: number
): UnifiedProductStatus {
  if (status === "INACTIVE" || status === "BLOCKED") {
    return "INACTIVE";
  }
  if (inventory <= 0) {
    return "OUT_OF_STOCK";
  }
  return "ACTIVE";
}

// ============================================
// PRESTASHOP STATUS MAPPING
// ============================================

/**
 * PrestaShop order states (default IDs):
 * 1 = Awaiting check payment, 2 = Payment accepted,
 * 3 = Processing in progress, 4 = Shipped,
 * 5 = Delivered, 6 = Canceled, 7 = Refunded,
 * 8 = Payment error, 9 = On backorder (paid),
 * 10 = Awaiting bank wire, 11 = Awaiting PayPal payment,
 * 12 = Remote payment accepted, 13 = Awaiting cod validation
 */
export function mapPrestaShopOrderStatus(
  stateId: number
): UnifiedOrderStatus {
  switch (stateId) {
    case 5:
      return "DELIVERED";
    case 4:
      return "SHIPPED";
    case 2: // Payment accepted
    case 12: // Remote payment accepted
      return "CONFIRMED";
    case 6:
      return "CANCELLED";
    case 7: // Refunded — mapped to CANCELLED for consistency with BigCommerce
      return "CANCELLED";
    case 1: // Awaiting check payment
    case 3: // Processing in progress
    case 8: // Payment error
    case 9: // On backorder (paid)
    case 10: // Awaiting bank wire
    case 11: // Awaiting PayPal payment
    case 13: // Awaiting cod validation
    default:
      return "PENDING";
  }
}

export function mapPrestaShopProductStatus(
  active: boolean | number | string,
  quantity: number
): UnifiedProductStatus {
  // PrestaShop uses "0"/"1" strings or boolean for active flag
  if (!active || active === "0" || active === 0) {
    return "INACTIVE";
  }
  if (quantity <= 0) {
    return "OUT_OF_STOCK";
  }
  return "ACTIVE";
}

