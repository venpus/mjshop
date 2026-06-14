import type { ShopOrderStatus } from '../models/shopOrder.js';

/** 판매 주문 건수·재고 기준 판매 상태 */
export function deriveShopOrderStatus(
  salesOrderCount: number,
  stockQuantity: number
): ShopOrderStatus {
  if (salesOrderCount <= 0) {
    return '판매대기';
  }
  if (stockQuantity <= 0) {
    return '품절';
  }
  return '판매중';
}
