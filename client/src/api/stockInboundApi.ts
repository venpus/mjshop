import { getApiBaseUrl } from './baseUrl';

const API_BASE_URL = getApiBaseUrl();

export interface StockInboundItem {
  id: number;
  purchaseOrderId: string;
  groupKey: string;
  productId: string | null;
  productName: string;
  poNumber: string | null;
  productMainImage: string | null;
  unitPrice: number | null;
  inboundQuantity: number;
  sellingPrice: number | null;
  stockQuantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface AvailablePurchaseOrderForInbound {
  id: string;
  poNumber: string;
  productName: string;
  productMainImage: string | null;
  productId: string | null;
  quantity: number;
  arrivedQuantity: number;
  unitPrice: number | null;
  orderUnitPrice: number | null;
  expectedFinalUnitPrice: number | null;
  sellingPrice: number | null;
}

export interface BatchCreateStockInboundResult {
  created: StockInboundItem[];
  skipped: Array<{ purchaseOrderId: string; reason: string }>;
}

function mapInboundItem(raw: Record<string, unknown>): StockInboundItem {
  return {
    id: Number(raw.id),
    purchaseOrderId: String(raw.purchaseOrderId),
    groupKey: String(raw.groupKey),
    productId: raw.productId != null ? String(raw.productId) : null,
    productName: String(raw.productName),
    poNumber: raw.poNumber != null ? String(raw.poNumber) : null,
    productMainImage: raw.productMainImage != null ? String(raw.productMainImage) : null,
    unitPrice: raw.unitPrice != null ? Number(raw.unitPrice) : null,
    inboundQuantity: Number(raw.inboundQuantity) || 0,
    sellingPrice: raw.sellingPrice != null ? Number(raw.sellingPrice) : null,
    stockQuantity: Number(raw.stockQuantity) || 0,
    createdAt: String(raw.createdAt),
    updatedAt: String(raw.updatedAt),
  };
}

function mapAvailableOrder(raw: Record<string, unknown>): AvailablePurchaseOrderForInbound {
  return {
    id: String(raw.id),
    poNumber: String(raw.poNumber),
    productName: String(raw.productName),
    productMainImage: raw.productMainImage != null ? String(raw.productMainImage) : null,
    productId: raw.productId != null ? String(raw.productId) : null,
    quantity: Number(raw.quantity) || 0,
    arrivedQuantity: Number(raw.arrivedQuantity) || 0,
    unitPrice: raw.unitPrice != null ? Number(raw.unitPrice) : null,
    orderUnitPrice: raw.orderUnitPrice != null ? Number(raw.orderUnitPrice) : null,
    expectedFinalUnitPrice:
      raw.expectedFinalUnitPrice != null ? Number(raw.expectedFinalUnitPrice) : null,
    sellingPrice: raw.sellingPrice != null ? Number(raw.sellingPrice) : null,
  };
}

export async function getStockInboundItems(): Promise<StockInboundItem[]> {
  const response = await fetch(`${API_BASE_URL}/stock-inbound`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '입고 목록 조회에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || '입고 목록 조회에 실패했습니다.');
  }

  return (data.data || []).map(mapInboundItem);
}

export async function getAvailablePurchaseOrdersForInbound(
  searchTerm?: string,
  page?: number,
  limit?: number
): Promise<{
  data: AvailablePurchaseOrderForInbound[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const params = new URLSearchParams();
  if (searchTerm?.trim()) params.set('search', searchTerm.trim());
  if (page != null) params.set('page', String(page));
  if (limit != null) params.set('limit', String(limit));

  const query = params.toString();
  const response = await fetch(
    `${API_BASE_URL}/stock-inbound/available-purchase-orders${query ? `?${query}` : ''}`,
    { credentials: 'include' }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '발주 목록 조회에 실패했습니다.');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || '발주 목록 조회에 실패했습니다.');
  }

  return {
    data: (result.data || []).map(mapAvailableOrder),
    total: result.pagination?.total ?? result.data?.length ?? 0,
    page: result.pagination?.page ?? 1,
    limit: result.pagination?.limit ?? result.data?.length ?? 15,
    totalPages: result.pagination?.totalPages ?? 1,
  };
}

export async function getStockInboundByGroupKey(groupKey: string): Promise<StockInboundItem | null> {
  const encoded = encodeURIComponent(groupKey);
  const response = await fetch(`${API_BASE_URL}/stock-inbound/by-group/${encoded}`, {
    credentials: 'include',
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '입고 항목 조회에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) return null;
  return mapInboundItem(data.data);
}

export async function addStockInboundBatch(
  purchaseOrderIds: string[]
): Promise<BatchCreateStockInboundResult> {
  const response = await fetch(`${API_BASE_URL}/stock-inbound/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ purchaseOrderIds }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.success) {
    throw new Error(result.error || '입고 추가에 실패했습니다.');
  }

  return {
    created: (result.data?.created || []).map(mapInboundItem),
    skipped: result.data?.skipped || [],
  };
}
