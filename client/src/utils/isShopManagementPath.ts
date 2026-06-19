const SHOP_MANAGEMENT_PATH_PREFIXES = [
  '/admin/orders',
  '/admin/shop-statements',
  '/admin/shop-payment',
  '/admin/sales-settlement',
  '/admin/shipping',
  '/admin/shop-buyers',
  '/admin/inventory',
] as const;

export function isShopManagementPath(pathname: string): boolean {
  return SHOP_MANAGEMENT_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
