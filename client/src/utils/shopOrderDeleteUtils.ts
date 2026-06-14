import type { ShopOrder } from '../api/shopOrderApi';

export const SHOP_ORDER_DELETE_BLOCKED_MESSAGE =
  '등록된 주문·예약이 있어 삭제할 수 없습니다. 모든 주문 건을 먼저 삭제해 주세요.';

export function canDeleteShopOrder(order: Pick<ShopOrder, 'lineCount'>): boolean {
  return order.lineCount === 0;
}
