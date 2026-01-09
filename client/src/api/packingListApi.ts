// 패킹리스트 API 클라이언트

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface PackingList {
  id: number;
  code: string;
  shipment_date: string;
  logistics_company: string | null;
  warehouse_arrival_date: string | null;
  actual_weight: number | null;
  weight_ratio: number | null;
  calculated_weight: number | null;
  shipping_cost: number;
  payment_date: string | null;
  wk_payment_date: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface PackingListItem {
  id: number;
  packing_list_id: number;
  purchase_order_id: string | null;
  product_name: string;
  product_image_url: string | null;
  entry_quantity: string | null;
  box_count: number;
  unit: '박스' | '마대';
  total_quantity: number;
  created_at: string;
  updated_at: string;
}

export interface DomesticInvoice {
  id: number;
  packing_list_id: number;
  invoice_number: string;
  created_at: string;
  updated_at: string;
  images?: DomesticInvoiceImage[];
}

export interface DomesticInvoiceImage {
  id: number;
  domestic_invoice_id: number;
  image_url: string;
  display_order: number;
  created_at: string;
}

export interface KoreaArrival {
  id: number;
  packing_list_item_id: number;
  arrival_date: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface PackingListWithItems extends PackingList {
  items: PackingListItemWithDetails[];
}

export interface PackingListItemWithDetails extends PackingListItem {
  domestic_invoices?: DomesticInvoice[];
  korea_arrivals?: KoreaArrival[];
}

export interface CreatePackingListRequest {
  code: string;
  shipment_date: string;
  logistics_company?: string;
  warehouse_arrival_date?: string;
  actual_weight?: number;
  weight_ratio?: number;
  calculated_weight?: number;
  shipping_cost?: number;
  payment_date?: string;
  wk_payment_date?: string;
}

export interface UpdatePackingListRequest {
  code?: string;
  shipment_date?: string;
  logistics_company?: string;
  warehouse_arrival_date?: string;
  actual_weight?: number;
  weight_ratio?: number | null;
  calculated_weight?: number;
  shipping_cost?: number;
  payment_date?: string;
  wk_payment_date?: string;
}

export interface CreatePackingListItemRequest {
  purchase_order_id?: string | null;
  product_name: string;
  product_image_url?: string;
  entry_quantity?: string;
  box_count: number;
  unit: '박스' | '마대';
  total_quantity: number;
  is_factory_to_warehouse?: boolean; // 공장→물류창고 플래그
}

export interface CreateDomesticInvoiceRequest {
  invoice_number: string;
}

export interface CreateKoreaArrivalRequest {
  arrival_date: string;
  quantity: number;
}

// 모든 패킹리스트 조회
export async function getAllPackingLists(): Promise<PackingListWithItems[]> {
  const response = await fetch(`${API_BASE_URL}/packing-lists`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('패킹리스트 조회에 실패했습니다.');
  }

  const data = await response.json();
  return data.success ? data.data : [];
}

// 월별 패킹리스트 조회
export async function getPackingListsByMonth(
  year: number,
  month: number
): Promise<PackingListWithItems[]> {
  const response = await fetch(
    `${API_BASE_URL}/packing-lists?year=${year}&month=${month}`,
    {
      credentials: 'include',
    }
  );

  if (!response.ok) {
    throw new Error('패킹리스트 조회에 실패했습니다.');
  }

  const data = await response.json();
  return data.success ? data.data : [];
}

// ID로 패킹리스트 조회
export async function getPackingListById(id: number): Promise<PackingListWithItems | null> {
  const response = await fetch(`${API_BASE_URL}/packing-lists/${id}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error('패킹리스트 조회에 실패했습니다.');
  }

  const data = await response.json();
  return data.success ? data.data : null;
}

// 코드로 패킹리스트 조회
export async function getPackingListByCode(code: string): Promise<PackingListWithItems | null> {
  const response = await fetch(`${API_BASE_URL}/packing-lists/code/${code}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error('패킹리스트 조회에 실패했습니다.');
  }

  const data = await response.json();
  return data.success ? data.data : null;
}

// 패킹리스트 생성
export async function createPackingList(data: CreatePackingListRequest): Promise<PackingList> {
  const response = await fetch(`${API_BASE_URL}/packing-lists`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '패킹리스트 생성에 실패했습니다.');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || '패킹리스트 생성에 실패했습니다.');
  }

  return result.data;
}

// 패킹리스트 수정
export async function updatePackingList(id: number, data: UpdatePackingListRequest): Promise<PackingList> {
  console.log('[비율 저장 - 클라이언트 API] updatePackingList 호출, id:', id, 'data.weight_ratio:', data.weight_ratio);
  const response = await fetch(`${API_BASE_URL}/packing-lists/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '패킹리스트 수정에 실패했습니다.');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || '패킹리스트 수정에 실패했습니다.');
  }

  console.log('[비율 저장 - 클라이언트 API] 업데이트 성공, 반환된 data.weight_ratio:', result.data?.weight_ratio);
  return result.data;
}

/**
 * A레벨 관리자 비용 지불 완료 상태 업데이트
 */
export async function updatePackingListAdminCostPaid(
  id: number,
  adminCostPaid: boolean
): Promise<PackingList> {
  const response = await fetch(`${API_BASE_URL}/packing-lists/${id}/admin-cost-paid`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ admin_cost_paid: adminCostPaid }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'A레벨 관리자 비용 지불 완료 상태 업데이트에 실패했습니다.');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'A레벨 관리자 비용 지불 완료 상태 업데이트에 실패했습니다.');
  }

  return result.data;
}

// 패킹리스트 삭제
export async function deletePackingList(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/packing-lists/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '패킹리스트 삭제에 실패했습니다.');
  }
}

// 패킹리스트 아이템 생성
export async function createPackingListItem(
  packingListId: number,
  data: CreatePackingListItemRequest
): Promise<PackingListItem> {
  const response = await fetch(`${API_BASE_URL}/packing-lists/${packingListId}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '패킹리스트 아이템 생성에 실패했습니다.');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || '패킹리스트 아이템 생성에 실패했습니다.');
  }

  return result.data;
}

// 패킹리스트 아이템 수정
export async function updatePackingListItem(
  itemId: number,
  data: Partial<CreatePackingListItemRequest>
): Promise<PackingListItem> {
  const response = await fetch(`${API_BASE_URL}/packing-lists/items/${itemId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '패킹리스트 아이템 수정에 실패했습니다.');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || '패킹리스트 아이템 수정에 실패했습니다.');
  }

  return result.data;
}

// 패킹리스트 아이템 삭제
export async function deletePackingListItem(itemId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/packing-lists/items/${itemId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '패킹리스트 아이템 삭제에 실패했습니다.');
  }
}

// 내륙송장 생성
export async function createDomesticInvoice(
  packingListId: number,
  data: CreateDomesticInvoiceRequest
): Promise<DomesticInvoice> {
  const response = await fetch(`${API_BASE_URL}/packing-lists/${packingListId}/invoices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '내륙송장 생성에 실패했습니다.');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || '내륙송장 생성에 실패했습니다.');
  }

  return result.data;
}

// 내륙송장 수정
export async function updateDomesticInvoice(
  invoiceId: number,
  data: { invoice_number?: string }
): Promise<DomesticInvoice> {
  const response = await fetch(`${API_BASE_URL}/packing-lists/invoices/${invoiceId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '내륙송장 수정에 실패했습니다.');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || '내륙송장 수정에 실패했습니다.');
  }

  return result.data;
}

// 내륙송장 삭제
export async function deleteDomesticInvoice(invoiceId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/packing-lists/invoices/${invoiceId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '내륙송장 삭제에 실패했습니다.');
  }
}

// 내륙송장 이미지 업로드
export async function uploadDomesticInvoiceImages(
  packingListId: number,
  invoiceId: number,
  files: File[]
): Promise<{ images: Array<{ id: number; url: string }> }> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('images', file);
  });

  const response = await fetch(`${API_BASE_URL}/packing-lists/${packingListId}/invoices/${invoiceId}/images`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '이미지 업로드에 실패했습니다.');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || '이미지 업로드에 실패했습니다.');
  }

  return result.data;
}

// 내륙송장 이미지 삭제
export async function deleteDomesticInvoiceImage(imageId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/packing-lists/invoices/images/${imageId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '이미지 삭제에 실패했습니다.');
  }
}

// 한국도착일 생성
export async function createKoreaArrival(
  itemId: number,
  data: CreateKoreaArrivalRequest
): Promise<KoreaArrival> {
  const response = await fetch(`${API_BASE_URL}/packing-lists/items/${itemId}/korea-arrivals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '한국도착일 생성에 실패했습니다.');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || '한국도착일 생성에 실패했습니다.');
  }

  return result.data;
}

// 한국도착일 수정
export async function updateKoreaArrival(
  arrivalId: number,
  data: Partial<CreateKoreaArrivalRequest>
): Promise<KoreaArrival> {
  const response = await fetch(`${API_BASE_URL}/packing-lists/korea-arrivals/${arrivalId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '한국도착일 수정에 실패했습니다.');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || '한국도착일 수정에 실패했습니다.');
  }

  return result.data;
}

// 한국도착일 삭제
export async function deleteKoreaArrival(arrivalId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/packing-lists/korea-arrivals/${arrivalId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '한국도착일 삭제에 실패했습니다.');
  }
}

// 발주별 배송비 집계 조회
export interface PurchaseOrderShippingCost {
  purchase_order_id: string;
  ordered_quantity: number;
  total_shipping_cost: number;
  total_shipped_quantity: number;
  unit_shipping_cost: number;
}

export interface PurchaseOrderShippingSummary {
  purchase_order_id: string;
  ordered_quantity: number;
  shipped_quantity: number;
  arrived_quantity: number;
  unshipped_quantity: number;
  shipping_quantity: number;
  warehouse_arrival_date?: string | null;
  has_korea_arrival?: number | boolean;
}

export async function getShippingCostByPurchaseOrder(
  purchaseOrderId: string
): Promise<PurchaseOrderShippingCost | null> {
  const response = await fetch(`${API_BASE_URL}/packing-lists/shipping-cost/${purchaseOrderId}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error('배송비 조회에 실패했습니다.');
  }

  const data = await response.json();
  return data.success ? data.data : null;
}

// 발주별 배송 수량 집계 조회
export async function getShippingSummaryByPurchaseOrder(
  purchaseOrderId: string
): Promise<PurchaseOrderShippingSummary | null> {
  const response = await fetch(`${API_BASE_URL}/packing-lists/shipping-summary/${purchaseOrderId}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error('배송 수량 조회에 실패했습니다.');
  }

  const data = await response.json();
  return data.success ? data.data : null;
}

// 발주 ID로 연결된 패킹리스트 목록 조회
export interface RelatedPackingList {
  packing_list_id: number;
  packing_list_code: string;
  shipment_date: string;
  logistics_company: string | null;
  warehouse_arrival_date: string | null;
  shipping_cost: number;
  shipped_quantity: number;
  korea_arrivals: Array<{
    arrival_date: string;
    quantity: number;
  }>;
  delivery_status: string;
}

export async function getPackingListsByPurchaseOrder(
  purchaseOrderId: string
): Promise<RelatedPackingList[]> {
  console.log('[getPackingListsByPurchaseOrder] API 호출 시작, purchaseOrderId:', purchaseOrderId);
  const response = await fetch(`${API_BASE_URL}/packing-lists/by-purchase-order/${purchaseOrderId}`, {
    credentials: 'include',
  });

  console.log('[getPackingListsByPurchaseOrder] 응답 상태:', response.status, response.statusText);

  if (!response.ok) {
    if (response.status === 404) {
      console.log('[getPackingListsByPurchaseOrder] 404 응답 - 빈 배열 반환');
      return [];
    }
    console.error('[getPackingListsByPurchaseOrder] 오류 응답:', response.status, response.statusText);
    throw new Error('패킹리스트 목록 조회에 실패했습니다.');
  }

  const data = await response.json();
  console.log('[getPackingListsByPurchaseOrder] 응답 데이터:', data);
  const result = data.success ? (data.data || []) : [];
  console.log('[getPackingListsByPurchaseOrder] 반환할 데이터:', result);
  return result;
}

