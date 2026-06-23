import type { ProductFormDataWithFiles } from '../components/ProductForm';

export type ProductKind = '판매가능' | '재고조사' | '예약판매' | '판매완료';

/** 등록/수정 폼에서 선택 가능한 구분 (판매완료는 카드에서만 지정) */
export const PRODUCT_FORM_KIND_OPTIONS: Array<{
  value: Exclude<ProductKind, '판매완료'>;
  label: string;
  description: string;
}> = [
  { value: '판매가능', label: '판매가능', description: '일반 판매 대상 상품' },
  { value: '재고조사', label: '재고조사', description: '재고 조사·확인용 상품' },
  { value: '예약판매', label: '예약판매', description: '예약 주문·선판매 상품' },
];

export type ProductKindFilter = 'all_active' | ProductKind;

export const PRODUCT_KIND_FILTER_OPTIONS: Array<{
  value: ProductKindFilter;
  label: string;
}> = [
  { value: 'all_active', label: '전체' },
  { value: '판매가능', label: '판매가능' },
  { value: '재고조사', label: '재고조사' },
  { value: '예약판매', label: '예약판매' },
  { value: '판매완료', label: '판매완료' },
];

export function parseProductKindFromApi(value: unknown): ProductKind {
  if (value === '재고조사') return '재고조사';
  if (value === '예약판매') return '예약판매';
  if (value === '판매완료') return '판매완료';
  return '판매가능';
}

export function matchesProductKindFilter(
  productKind: ProductKind,
  filter: ProductKindFilter
): boolean {
  if (filter === 'all_active') return productKind !== '판매완료';
  return productKind === filter;
}

export function getProductKindBadgeClass(kind: ProductKind): string {
  if (kind === '재고조사') {
    return 'bg-amber-100 text-amber-800 border-amber-200';
  }
  if (kind === '예약판매') {
    return 'bg-sky-100 text-sky-800 border-sky-200';
  }
  if (kind === '판매완료') {
    return 'bg-slate-200 text-slate-700 border-slate-300';
  }
  return 'bg-emerald-100 text-emerald-800 border-emerald-200';
}

/** 상품 카드 테두리 — 태그 색상과 일치 */
export function getProductKindCardBorderClass(kind: ProductKind): string {
  if (kind === '재고조사') {
    return 'border-amber-300 hover:border-amber-400 hover:shadow-md hover:shadow-amber-100';
  }
  if (kind === '예약판매') {
    return 'border-sky-300 hover:border-sky-400 hover:shadow-md hover:shadow-sky-100';
  }
  if (kind === '판매완료') {
    return 'border-slate-300 opacity-80 hover:border-slate-400 hover:shadow-md hover:shadow-slate-100';
  }
  return 'border-emerald-300 hover:border-emerald-400 hover:shadow-md hover:shadow-emerald-100';
}

export interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  logisticsCost: number;
  finalUnitCost: number | null;
  hasTag: boolean;
  stock: number;
  status: '판매중' | '품절' | '숨김';
  productKind: ProductKind;
  size: string;
  packagingSize: string;
  weight: string;
  setCount: number;
  smallPackCount: number;
  boxCount: number;
  reorderMoq: number | null;
  deliveryDate: string | null;
  deliveryDays: number | null;
  tagAddonEnabled: boolean;
  tagAddonPrice: number | null;
  packagingAddonEnabled: boolean;
  packagingAddonPrice: number | null;
  laborCost: number;
  adCopy: string | null;
  mainImage: string;
  images: string[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const SERVER_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export function getFullImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) return '';

  let fullUrl: string;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    fullUrl = imageUrl;
  } else {
    fullUrl = `${SERVER_BASE_URL}${imageUrl}`;
  }

  if (!fullUrl.includes('?')) {
    const cacheBuster = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    return `${fullUrl}?v=${cacheBuster}`;
  }

  return fullUrl;
}

/** API 전송용: 쿼리·호스트 제거 후 서버 저장 경로(/uploads/...)로 통일 */
export function normalizeImageUrlForServer(url: string): string {
  const withoutQuery = url.split('?')[0];
  try {
    if (withoutQuery.startsWith('http://') || withoutQuery.startsWith('https://')) {
      return new URL(withoutQuery).pathname;
    }
  } catch {
    // fall through
  }
  return withoutQuery;
}

export function normalizeImageUrlsForServer(urls: string[]): string[] {
  return urls.map(normalizeImageUrlForServer);
}

export function mapApiProductToClient(p: Record<string, unknown>): CatalogProduct {
  const mainImageUrl = getFullImageUrl(p.main_image as string | null);
  return {
    id: String(p.id),
    name: String(p.name),
    price: Number(p.price) || 0,
    logisticsCost: Number(p.logistics_cost) || 0,
    finalUnitCost: p.final_unit_cost != null ? Number(p.final_unit_cost) : null,
    hasTag: Boolean(p.has_tag),
    stock: Number(p.stock) || 0,
    status: p.status as CatalogProduct['status'],
    productKind: parseProductKindFromApi(p.product_kind),
    size: p.size ? String(p.size) : '',
    packagingSize: p.packaging_size ? String(p.packaging_size) : '',
    weight: p.weight ? String(p.weight) : '',
    setCount: Number(p.set_count) || 1,
    smallPackCount: Number(p.small_pack_count) || 1,
    boxCount: Number(p.box_count) || 1,
    reorderMoq: p.reorder_moq != null ? Number(p.reorder_moq) : null,
    deliveryDate: p.delivery_date
      ? String(p.delivery_date).slice(0, 10)
      : null,
    deliveryDays: p.delivery_days != null ? Number(p.delivery_days) : null,
    tagAddonEnabled: Boolean(p.tag_addon_enabled),
    tagAddonPrice: p.tag_addon_price != null ? Number(p.tag_addon_price) : null,
    packagingAddonEnabled: Boolean(p.packaging_addon_enabled),
    packagingAddonPrice:
      p.packaging_addon_price != null ? Number(p.packaging_addon_price) : null,
    laborCost: Number(p.labor_cost) || 0,
    adCopy: p.ad_copy != null ? String(p.ad_copy) : null,
    mainImage: mainImageUrl,
    images: ((p.images as string[]) || []).map((img) => getFullImageUrl(img)),
  };
}

function appendProductFormFields(formDataToSend: FormData, formData: ProductFormDataWithFiles) {
  formDataToSend.append('price', formData.price === '' ? '0' : formData.price.toString());
  formDataToSend.append(
    'logisticsCost',
    formData.logisticsCost === '' ? '0' : formData.logisticsCost.toString()
  );
  formDataToSend.append('hasTag', formData.hasTag ? '1' : '0');
  formDataToSend.append('productKind', formData.productKind ?? '판매가능');
  formDataToSend.append('stock', formData.stock === '' ? '0' : formData.stock.toString());
  formDataToSend.append('packagingSize', formData.packagingSize || '');
  formDataToSend.append(
    'reorderMoq',
    formData.reorderMoq === '' ? '' : formData.reorderMoq.toString()
  );
  formDataToSend.append(
    'deliveryDate',
    formData.deliveryDate ? String(formData.deliveryDate).slice(0, 10) : ''
  );
  formDataToSend.append('tagAddonEnabled', formData.tagAddonEnabled ? '1' : '0');
  formDataToSend.append(
    'tagAddonPrice',
    formData.tagAddonEnabled && formData.tagAddonPrice !== ''
      ? formData.tagAddonPrice.toString()
      : ''
  );
  formDataToSend.append(
    'packagingAddonEnabled',
    formData.packagingAddonEnabled ? '1' : '0'
  );
  formDataToSend.append(
    'packagingAddonPrice',
    formData.packagingAddonEnabled && formData.packagingAddonPrice !== ''
      ? formData.packagingAddonPrice.toString()
      : ''
  );
  formDataToSend.append(
    'laborCost',
    formData.laborCost === '' ? '0' : formData.laborCost.toString()
  );
  if (formData.mainImageIsNew !== undefined) {
    formDataToSend.append('mainImageIsNew', formData.mainImageIsNew ? '1' : '0');
  }
}

export function collectProductImageUrls(product: CatalogProduct): string[] {
  const urls: string[] = [];
  if (product.mainImage) {
    urls.push(getFullImageUrl(product.mainImage));
  }
  for (const img of product.images) {
    const full = getFullImageUrl(img);
    if (!urls.some((existing) => existing === full || existing.endsWith(img) || full.endsWith(img))) {
      urls.push(full);
    }
  }
  return urls;
}

export function mapProductToFormInitial(product: CatalogProduct) {
  return {
    price: product.price,
    logisticsCost: product.logisticsCost,
    hasTag: product.hasTag,
    stock: product.stock,
    productKind: product.productKind === '판매완료' ? '판매가능' : product.productKind,
    size: product.size || '',
    packagingSize: product.packagingSize || '',
    setCount: product.setCount,
    weight: product.weight || '',
    reorderMoq: product.reorderMoq ?? '',
    deliveryDate: product.deliveryDate ?? '',
    tagAddonEnabled: product.tagAddonEnabled,
    tagAddonPrice: product.tagAddonPrice ?? '',
    packagingAddonEnabled: product.packagingAddonEnabled,
    packagingAddonPrice: product.packagingAddonPrice ?? '',
    laborCost: product.laborCost,
    existingImageUrls: collectProductImageUrls(product),
  };
}

export async function fetchCatalogProducts(): Promise<CatalogProduct[]> {
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '상품 목록을 불러오는데 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success || !data.data) {
    return [];
  }

  return (data.data as Record<string, unknown>[]).map(mapApiProductToClient);
}

export async function fetchCatalogProductById(id: string): Promise<CatalogProduct> {
  const response = await fetch(`${API_BASE_URL}/products/${id}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('상품 정보를 불러오는데 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success || !data.data) {
    throw new Error('상품 정보를 불러오는데 실패했습니다.');
  }

  return mapApiProductToClient(data.data as Record<string, unknown>);
}

export async function createCatalogProduct(formData: ProductFormDataWithFiles): Promise<void> {
  const formDataToSend = new FormData();
  appendProductFormFields(formDataToSend, formData);
  formDataToSend.append('size', formData.size || '');
  formDataToSend.append('setCount', formData.setCount.toString());
  if (formData.weight) {
    formDataToSend.append('weight', formData.weight);
  }

  if (formData.images && formData.images.length > 0) {
    formData.images.forEach((file) => {
      formDataToSend.append('images', file);
    });
  }

  const response = await fetch(`${API_BASE_URL}/products`, {
    method: 'POST',
    credentials: 'include',
    body: formDataToSend,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '상품 생성에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error('상품 생성에 실패했습니다.');
  }
}

export async function updateCatalogProduct(
  id: string,
  formData: ProductFormDataWithFiles
): Promise<void> {
  const formDataToSend = new FormData();
  appendProductFormFields(formDataToSend, formData);
  formDataToSend.append('size', formData.size || '');
  formDataToSend.append('setCount', formData.setCount.toString());
  if (formData.weight) {
    formDataToSend.append('weight', formData.weight);
  }

  if (formData.existingImageUrls && formData.existingImageUrls.length > 0) {
    formDataToSend.append(
      'existingImageUrls',
      JSON.stringify(normalizeImageUrlsForServer(formData.existingImageUrls))
    );
  }

  if (formData.images && formData.images.length > 0) {
    formData.images.forEach((file) => {
      formDataToSend.append('images', file);
    });
  }

  const response = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'PUT',
    body: formDataToSend,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '상품 수정에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error('상품 수정에 실패했습니다.');
  }
}

export async function deleteCatalogProduct(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '상품 삭제에 실패했습니다.');
  }

  await response.json();
}

export async function setProductMainImage(id: string, mainImageUrl: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/products/${id}/main-image`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ mainImageUrl: normalizeImageUrlForServer(mainImageUrl) }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '메인 이미지 변경에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error('메인 이미지 변경에 실패했습니다.');
  }
}

export async function saveProductAdCopy(id: string, adCopy: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/products/${id}/ad-copy`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ adCopy }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '광고문구 저장에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error('광고문구 저장에 실패했습니다.');
  }
}

export async function setProductKind(id: string, productKind: ProductKind): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/products/${id}/product-kind`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ productKind }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '상품 구분 변경에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error('상품 구분 변경에 실패했습니다.');
  }
}
