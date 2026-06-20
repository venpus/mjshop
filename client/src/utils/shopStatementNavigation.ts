export const SHOP_STATEMENTS_PATH = '/admin/shop-statements';

export function parseShopStatementFocusGroupKeys(
  value: string | null | undefined
): Set<string> | null {
  if (!value?.trim()) return null;
  const keys = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return keys.length > 0 ? new Set(keys) : null;
}

export function buildShopStatementsFocusPath(options: {
  tab?: 'orders' | 'reservations';
  groupKeys: string[];
  preview?: boolean;
}): string {
  const params = new URLSearchParams();
  if (options.tab === 'reservations') {
    params.set('tab', 'reservations');
  } else if (options.tab === 'orders') {
    params.set('tab', 'orders');
  }
  if (options.groupKeys.length > 0) {
    params.set('g', options.groupKeys.join(','));
  }
  if (options.preview) {
    params.set('preview', '1');
  }
  const query = params.toString();
  return query ? `${SHOP_STATEMENTS_PATH}?${query}` : SHOP_STATEMENTS_PATH;
}
