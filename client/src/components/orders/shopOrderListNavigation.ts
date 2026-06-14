import type { ShopOrderListTab } from './ShopOrderListTabs';

export const SHOP_ORDER_LIST_TAB_PARAM = 'tab';

export function parseShopOrderListTab(value: string | null | undefined): ShopOrderListTab {
  return value === 'lines' ? 'lines' : 'products';
}

export function shopOrdersListPath(tab: ShopOrderListTab = 'products'): string {
  return tab === 'lines' ? '/admin/orders?tab=lines' : '/admin/orders';
}

export function shopOrderDetailPath(orderId: string, listTab: ShopOrderListTab = 'products'): string {
  return listTab === 'lines'
    ? `/admin/orders/${orderId}?tab=lines`
    : `/admin/orders/${orderId}`;
}

export function shopOrderListSearchParams(tab: ShopOrderListTab): Record<string, string> | null {
  return tab === 'lines' ? { [SHOP_ORDER_LIST_TAB_PARAM]: 'lines' } : null;
}
