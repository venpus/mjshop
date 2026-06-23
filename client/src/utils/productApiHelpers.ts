import type { ProductFormDataWithFiles } from '../components/ProductForm';

export interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  logisticsCost: number;
  finalUnitCost: number | null;
  hasTag: boolean;
  stock: number;
  status: '판매중' | '품절' | '숨김';
  size: string;
  packagingSize: string;
  weight: string;
  setCount: number;
  smallPackCount: number;
  boxCount: number;
  reorderMoq: number | null;
  deliveryDays: number | null;
  tagAddonEnabled: boolean;
  tagAddonPrice: number | null;
  packagingAddonEnabled: boolean;
  packagingAddonPrice: number | null;
  laborCost: number;
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
    size: p.size ? String(p.size) : '',
    packagingSize: p.packaging_size ? String(p.packaging_size) : '',
    weight: p.weight ? String(p.weight) : '',
    setCount: Number(p.set_count) || 1,
    smallPackCount: Number(p.small_pack_count) || 1,
    boxCount: Number(p.box_count) || 1,
    reorderMoq: p.reorder_moq != null ? Number(p.reorder_moq) : null,
    deliveryDays: p.delivery_days != null ? Number(p.delivery_days) : null,
    tagAddonEnabled: Boolean(p.tag_addon_enabled),
    tagAddonPrice: p.tag_addon_price != null ? Number(p.tag_addon_price) : null,
    packagingAddonEnabled: Boolean(p.packaging_addon_enabled),
    packagingAddonPrice:
      p.packaging_addon_price != null ? Number(p.packaging_addon_price) : null,
    laborCost: Number(p.labor_cost) || 0,
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
  formDataToSend.append('stock', formData.stock === '' ? '0' : formData.stock.toString());
  formDataToSend.append('packagingSize', formData.packagingSize || '');
  formDataToSend.append(
    'reorderMoq',
    formData.reorderMoq === '' ? '' : formData.reorderMoq.toString()
  );
  formDataToSend.append(
    'deliveryDays',
    formData.deliveryDays === '' ? '' : formData.deliveryDays.toString()
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
    size: product.size || '',
    packagingSize: product.packagingSize || '',
    setCount: product.setCount,
    weight: product.weight || '',
    reorderMoq: product.reorderMoq ?? '',
    deliveryDays: product.deliveryDays ?? '',
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
