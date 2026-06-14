import type { StockInboundItem } from '../api/stockInboundApi';
import { getFullImageUrl } from '../api/purchaseOrderApi';
import type { InventoryListItem } from '../components/inventory/types';

export function mapStockInboundToListItem(item: StockInboundItem): InventoryListItem {
  return {
    id: String(item.id),
    groupKey: item.groupKey,
    productName: item.productName,
    productImage: getFullImageUrl(item.productMainImage),
    purchaseOrderId: item.purchaseOrderId,
    poNumber: item.poNumber ?? undefined,
    unitPrice: item.unitPrice,
    inboundQuantity: item.inboundQuantity,
    sellingPrice: item.sellingPrice,
    stockQuantity: item.stockQuantity,
    productId: item.productId ?? undefined,
  };
}

export function resolveDisplayUnitPrice(order: {
  expectedFinalUnitPrice?: number | null;
  orderUnitPrice?: number | null;
  unitPrice?: number | null;
}): number | null {
  if (order.expectedFinalUnitPrice != null && order.expectedFinalUnitPrice > 0) {
    return order.expectedFinalUnitPrice;
  }
  if (order.orderUnitPrice != null && order.orderUnitPrice > 0) {
    return order.orderUnitPrice;
  }
  if (order.unitPrice != null && order.unitPrice > 0) {
    return order.unitPrice;
  }
  return null;
}

export function resolveDefaultInboundQuantity(order: {
  arrivedQuantity: number;
  quantity: number;
}): number {
  if (order.arrivedQuantity > 0) return order.arrivedQuantity;
  return order.quantity;
}
