export const PRODUCT_COLLAB_LIST_PATH = '/admin/product-collab/list';

export interface ProductListUrlState {
  page: number;
  search: string;
  status: string;
  category: string;
}

export function parseProductListSearchParams(params: URLSearchParams): ProductListUrlState {
  const rawPage = parseInt(params.get('page') ?? '1', 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  return {
    page,
    search: params.get('search') ?? '',
    status: params.get('status') ?? '',
    category: params.get('category') ?? '',
  };
}

export function buildProductListSearchParams(state: ProductListUrlState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.page > 1) params.set('page', String(state.page));
  if (state.search.trim()) params.set('search', state.search.trim());
  if (state.status) params.set('status', state.status);
  if (state.category) params.set('category', state.category);
  return params;
}

export function productListUrlStateEquals(a: ProductListUrlState, b: ProductListUrlState): boolean {
  return (
    a.page === b.page &&
    a.search === b.search &&
    a.status === b.status &&
    a.category === b.category
  );
}

export function productListPathWithParams(state: ProductListUrlState): string {
  const query = buildProductListSearchParams(state).toString();
  return query ? `${PRODUCT_COLLAB_LIST_PATH}?${query}` : PRODUCT_COLLAB_LIST_PATH;
}

/** 상세 → 목록 복귀 URL 검증 (오픈 리다이렉트 방지) */
export function sanitizeProductListReturnTo(returnTo: string | null | undefined): string {
  if (!returnTo) return PRODUCT_COLLAB_LIST_PATH;
  try {
    const decoded = decodeURIComponent(returnTo);
    if (!decoded.startsWith(PRODUCT_COLLAB_LIST_PATH)) return PRODUCT_COLLAB_LIST_PATH;
    if (decoded.includes('://') || decoded.includes('..')) return PRODUCT_COLLAB_LIST_PATH;
    return decoded;
  } catch {
    return PRODUCT_COLLAB_LIST_PATH;
  }
}

export function buildThreadDetailPath(
  productId: number,
  listState: ProductListUrlState
): string {
  const returnTo = productListPathWithParams(listState);
  return `/admin/product-collab/thread/${productId}?returnTo=${encodeURIComponent(returnTo)}`;
}
