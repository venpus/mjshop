import type { ShopOrderListTab } from './ShopOrderListTabs';
import {
  parseShopOrderListTab,
  sanitizeShopOrdersListReturnTo,
  SHOP_ORDER_LIST_TAB_PARAM,
  SHOP_ORDERS_LIST_PATH,
} from './shopOrderListUrlParams';

export { parseShopOrderListTab, sanitizeShopOrdersListReturnTo, SHOP_ORDER_LIST_TAB_PARAM, SHOP_ORDERS_LIST_PATH };

export function shopOrdersListPath(tab: ShopOrderListTab = 'products'): string {
  if (tab === 'lines') return '/admin/orders?tab=lines';
  if (tab === 'reservations') return '/admin/orders?tab=reservations';
  return '/admin/orders';
}

export function shopOrderDetailPath(
  orderId: string,
  listTab: ShopOrderListTab = 'products',
  returnPath?: string
): string {
  const base = `/admin/orders/${orderId}`;
  const params = new URLSearchParams();
  if (listTab === 'lines') params.set(SHOP_ORDER_LIST_TAB_PARAM, 'lines');
  if (listTab === 'reservations') params.set(SHOP_ORDER_LIST_TAB_PARAM, 'reservations');
  if (returnPath) params.set('returnPath', returnPath);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function shopOrderListSearchParams(tab: ShopOrderListTab): Record<string, string> | null {
  if (tab === 'products') return null;
  return { [SHOP_ORDER_LIST_TAB_PARAM]: tab };
}

export function shopOrderListReturnPath(pathname: string, search: string): string {
  return `${pathname}${search}`;
}
