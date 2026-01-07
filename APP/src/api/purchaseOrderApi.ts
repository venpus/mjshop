// 발주 관련 API 함수

import { API_BASE_URL, SERVER_BASE_URL, getFullImageUrl } from '../config/constants';

export interface PurchaseOrderWithUnshipped {
  id: string;
  po_number: string;
  product_name: string;
  product_main_image: string | null;
  quantity: number;
  unshipped_quantity: number;
  product_name_chinese?: string | null;
}

/**
 * 미출고 수량이 있는 발주 목록 조회
 * @param searchTerm 검색어 (선택사항)
 * @param page 페이지 번호 (1부터 시작)
 * @param limit 페이지당 항목 수
 */
export async function getPurchaseOrdersWithUnshipped(
  searchTerm?: string,
  page?: number,
  limit?: number
): Promise<{
  data: PurchaseOrderWithUnshipped[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const params = new URLSearchParams();
  if (searchTerm && searchTerm.trim()) {
    params.set('search', searchTerm.trim());
  }
  if (page !== undefined) {
    params.set('page', page.toString());
  }
  if (limit !== undefined) {
    params.set('limit', limit.toString());
  }
  
  const queryString = params.toString();
  const url = `${API_BASE_URL}/purchase-orders/unshipped${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(url, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('미출고 발주 목록 조회에 실패했습니다.');
  }

  const responseData = await response.json();
  if (!responseData.success) {
    throw new Error(responseData.error || '미출고 발주 목록 조회에 실패했습니다.');
  }

  return {
    data: responseData.data.map((po: any) => ({
      id: po.id,
      po_number: po.po_number,
      product_name: po.product_name,
      product_main_image: po.product_main_image,
      quantity: po.quantity || 0,
      unshipped_quantity: po.unshipped_quantity || 0,
      product_name_chinese: po.product_name_chinese || null,
    })),
    total: responseData.pagination?.total || responseData.data.length,
    page: responseData.pagination?.page || 1,
    limit: responseData.pagination?.limit || responseData.data.length,
    totalPages: responseData.pagination?.totalPages || 1,
  };
}

/**
 * 발주 목록 조회 (전체)
 * @param page 페이지 번호 (1부터 시작)
 * @param limit 페이지당 항목 수
 * @param searchTerm 검색어 (선택사항)
 */
export interface PurchaseOrderListItem {
  id: string;
  po_number: string;
  product_name: string;
  product_name_chinese?: string | null;
  product_main_image?: string | null;
  quantity: number;
  unit_price: number;
  back_margin?: number;
  order_unit_price?: number;
  expected_final_unit_price?: number | null;
  order_date: string;
  order_status: string;
  payment_status: string;
  size?: string | null;
  weight?: string | null;
  packaging?: number | null;
  shipping_cost?: number;
  warehouse_shipping_cost?: number;
  commission_rate?: number;
  option_cost?: number;
  labor_cost?: number;
  packing_list_shipping_cost?: number;
  factory_shipped_quantity?: number;
  unshipped_quantity?: number;
  shipped_quantity?: number;
  shipping_quantity?: number;
  arrived_quantity?: number;
  unreceived_quantity?: number;
  work_start_date?: string | null;
  work_end_date?: string | null;
  supplier?: {
    id: number;
    name: string;
    url: string | null;
  };
  product?: {
    id: string | null;
    name: string;
    name_chinese: string | null;
    main_image: string | null;
    category?: string;
    size?: string | null;
    weight?: string | null;
  };
}

export async function getPurchaseOrders(
  page: number = 1,
  limit: number = 20,
  searchTerm?: string
): Promise<{
  data: PurchaseOrderListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const params = new URLSearchParams();
  params.set('page', page.toString());
  params.set('limit', limit.toString());
  if (searchTerm && searchTerm.trim()) {
    params.set('search', searchTerm.trim());
  }

  const response = await fetch(`${API_BASE_URL}/purchase-orders?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '발주 목록을 불러오는데 실패했습니다.');
  }

  const responseData = await response.json();
  if (!responseData.success) {
    throw new Error(responseData.error || '발주 목록을 불러오는데 실패했습니다.');
  }

  return {
    data: responseData.data.map((po: any) => ({
      id: po.id,
      po_number: po.po_number || '',
      product_name: po.product_name || po.product?.name || '',
      product_name_chinese: po.product_name_chinese || po.product?.name_chinese || null,
      product_main_image: po.product_main_image || po.product?.main_image || null,
      quantity: po.quantity || 0,
      unit_price: po.unit_price || 0,
      back_margin: po.back_margin || 0,
      order_unit_price: po.order_unit_price || (po.unit_price || 0) + (po.back_margin || 0),
      expected_final_unit_price: po.expected_final_unit_price || null,
      order_date: po.order_date || po.date || '',
      order_status: po.order_status || (po.is_confirmed ? '발주확인' : '발주 대기'),
      payment_status: po.payment_status || '미결제',
      size: po.size || po.product_size || po.product?.size || null,
      weight: po.weight || po.product_weight || po.product?.weight || null,
      packaging: po.packaging || po.product_packaging_size || null,
      shipping_cost: po.shipping_cost || 0,
      warehouse_shipping_cost: po.warehouse_shipping_cost || 0,
      commission_rate: po.commission_rate || 0,
      option_cost: po.option_cost || 0,
      labor_cost: po.labor_cost || 0,
      packing_list_shipping_cost: po.packing_list_shipping_cost || 0,
      factory_shipped_quantity: po.factory_shipped_quantity || 0,
      unshipped_quantity: po.unshipped_quantity || 0,
      shipped_quantity: po.shipped_quantity || 0,
      shipping_quantity: po.shipping_quantity || 0,
      arrived_quantity: po.arrived_quantity || 0,
      unreceived_quantity: po.unreceived_quantity || 0,
      work_start_date: po.work_start_date || null,
      work_end_date: po.work_end_date || null,
      supplier: po.supplier,
      product: po.product,
    })),
    total: responseData.pagination?.total || responseData.data.length,
    page: responseData.pagination?.page || page,
    limit: responseData.pagination?.limit || limit,
    totalPages: responseData.pagination?.totalPages || 1,
  };
}

/**
 * 발주 상세 조회
 * @param id 발주 ID
 */
export interface PurchaseOrderDetail {
  id: string;
  po_number: string;
  product_name: string;
  product_name_chinese?: string | null;
  product_main_image?: string | null;
  quantity: number;
  unit_price: number;
  back_margin?: number;
  order_unit_price?: number;
  expected_final_unit_price?: number | null;
  order_date: string;
  delivery_date?: string | null;
  order_status: string;
  payment_status: string;
  size?: string | null;
  weight?: string | null;
  packaging?: number | null;
  shipping_cost?: number;
  warehouse_shipping_cost?: number;
  commission_rate?: number;
  commission_type?: string | null;
  option_cost?: number;
  labor_cost?: number;
  packing_list_shipping_cost?: number;
  factory_shipped_quantity?: number;
  unshipped_quantity?: number;
  shipped_quantity?: number;
  shipping_quantity?: number;
  arrived_quantity?: number;
  unreceived_quantity?: number;
  work_start_date?: string | null;
  work_end_date?: string | null;
  is_confirmed?: boolean;
  advance_payment_rate?: number;
  advance_payment_date?: string | null;
  balance_payment_date?: string | null;
  supplier?: {
    id: number;
    name: string;
    url: string | null;
  };
  product?: {
    id: string | null;
    name: string;
    name_chinese: string | null;
    main_image: string | null;
    category?: string;
    size?: string | null;
    weight?: string | null;
  };
  optionItems?: Array<{
    id?: number;
    name: string;
    unit_price: number;
    quantity: number;
  }>;
  laborCostItems?: Array<{
    id?: number;
    name: string;
    unit_price: number;
    quantity: number;
  }>;
  factoryShipments?: Array<{
    id?: number;
    shipped_quantity: number;
    shipped_date: string;
    tracking_number?: string | null;
    notes?: string | null;
  }>;
  returnExchangeItems?: Array<{
    id?: number;
    return_quantity: number;
    return_date: string;
    reason?: string | null;
  }>;
  workItems?: Array<{
    id?: number;
    description: string;
    completed: boolean;
  }>;
}

export async function getPurchaseOrderDetail(id: string): Promise<PurchaseOrderDetail> {
  const response = await fetch(`${API_BASE_URL}/purchase-orders/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '발주 상세 정보를 불러오는데 실패했습니다.');
  }

  const responseData = await response.json();
  if (!responseData.success) {
    throw new Error(responseData.error || '발주 상세 정보를 불러오는데 실패했습니다.');
  }

  const data = responseData.data;
  return {
    id: data.id,
    po_number: data.po_number || '',
    product_name: data.product_name || data.product?.name || '',
    product_name_chinese: data.product_name_chinese || data.product?.name_chinese || null,
    product_main_image: data.product_main_image || data.product?.main_image || null,
    quantity: data.quantity || 0,
    unit_price: data.unit_price || 0,
    back_margin: data.back_margin || 0,
    order_unit_price: data.order_unit_price || (data.unit_price || 0) + (data.back_margin || 0),
    expected_final_unit_price: data.expected_final_unit_price || null,
    order_date: data.order_date || data.date || '',
    delivery_date: data.delivery_date || null,
    order_status: data.order_status || (data.is_confirmed ? '발주확인' : '발주 대기'),
    payment_status: data.payment_status || '미결제',
    size: data.size || data.product_size || data.product?.size || null,
    weight: data.weight || data.product_weight || data.product?.weight || null,
    packaging: data.packaging || data.product_packaging_size || null,
    shipping_cost: data.shipping_cost || 0,
    warehouse_shipping_cost: data.warehouse_shipping_cost || 0,
    commission_rate: data.commission_rate || 0,
    commission_type: data.commission_type || null,
    option_cost: data.option_cost || 0,
    labor_cost: data.labor_cost || 0,
    packing_list_shipping_cost: data.packing_list_shipping_cost || 0,
    factory_shipped_quantity: data.factory_shipped_quantity || 0,
    unshipped_quantity: data.unshipped_quantity || 0,
    shipped_quantity: data.shipped_quantity || 0,
    shipping_quantity: data.shipping_quantity || 0,
    arrived_quantity: data.arrived_quantity || 0,
    unreceived_quantity: data.unreceived_quantity || 0,
    work_start_date: data.work_start_date || null,
    work_end_date: data.work_end_date || null,
    is_confirmed: data.is_confirmed || false,
    advance_payment_rate: data.advance_payment_rate || 0,
    advance_payment_date: data.advance_payment_date || null,
    balance_payment_date: data.balance_payment_date || null,
    supplier: data.supplier,
    product: data.product,
    optionItems: data.optionItems || [],
    laborCostItems: data.laborCostItems || [],
    factoryShipments: data.factoryShipments || [],
    returnExchangeItems: data.returnExchangeItems || [],
    workItems: data.workItems || [],
  };
}

/**
 * 발주 생성
 * @param data 발주 생성 데이터
 */
export interface CreatePurchaseOrderData {
  product_name: string;
  product_name_chinese?: string;
  product_category?: string;
  product_size?: string;
  product_weight?: string;
  product_set_count?: number;
  unit_price: number;
  order_unit_price?: number;
  quantity: number;
  order_date?: string;
  estimated_shipment_date?: string;
  created_by?: string;
}

export async function createPurchaseOrder(data: CreatePurchaseOrderData): Promise<PurchaseOrderDetail> {
  const response = await fetch(`${API_BASE_URL}/purchase-orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '발주 생성에 실패했습니다.');
  }

  const responseData = await response.json();
  if (!responseData.success) {
    throw new Error(responseData.error || '발주 생성에 실패했습니다.');
  }

  const result = responseData.data;
  return {
    id: result.id,
    po_number: result.po_number || '',
    product_name: result.product_name || result.product?.name || '',
    product_name_chinese: result.product_name_chinese || result.product?.name_chinese || null,
    product_main_image: result.product_main_image || result.product?.main_image || null,
    quantity: result.quantity || 0,
    unit_price: result.unit_price || 0,
    back_margin: result.back_margin || 0,
    order_unit_price: result.order_unit_price || (result.unit_price || 0) + (result.back_margin || 0),
    expected_final_unit_price: result.expected_final_unit_price || null,
    order_date: result.order_date || result.date || '',
    delivery_date: result.delivery_date || null,
    order_status: result.order_status || (result.is_confirmed ? '발주확인' : '발주 대기'),
    payment_status: result.payment_status || '미결제',
    size: result.size || result.product_size || result.product?.size || null,
    weight: result.weight || result.product_weight || result.product?.weight || null,
    packaging: result.packaging || result.product_packaging_size || null,
    shipping_cost: result.shipping_cost || 0,
    warehouse_shipping_cost: result.warehouse_shipping_cost || 0,
    commission_rate: result.commission_rate || 0,
    commission_type: result.commission_type || null,
    option_cost: result.option_cost || 0,
    labor_cost: result.labor_cost || 0,
    packing_list_shipping_cost: result.packing_list_shipping_cost || 0,
    factory_shipped_quantity: result.factory_shipped_quantity || 0,
    unshipped_quantity: result.unshipped_quantity || 0,
    shipped_quantity: result.shipped_quantity || 0,
    shipping_quantity: result.shipping_quantity || 0,
    arrived_quantity: result.arrived_quantity || 0,
    unreceived_quantity: result.unreceived_quantity || 0,
    work_start_date: result.work_start_date || null,
    work_end_date: result.work_end_date || null,
    is_confirmed: result.is_confirmed || false,
    advance_payment_rate: result.advance_payment_rate || 0,
    advance_payment_date: result.advance_payment_date || null,
    balance_payment_date: result.balance_payment_date || null,
    supplier: result.supplier,
    product: result.product,
    optionItems: result.optionItems || [],
    laborCostItems: result.laborCostItems || [],
    factoryShipments: result.factoryShipments || [],
    returnExchangeItems: result.returnExchangeItems || [],
    workItems: result.workItems || [],
  };
}

/**
 * 발주 메인 이미지 업로드 (React Native용)
 * @param orderId 발주 ID
 * @param imageUri 이미지 URI
 */
export async function uploadPurchaseOrderMainImage(
  orderId: string,
  imageUri: string
): Promise<void> {
  const formData = new FormData();
  formData.append('mainImage', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'main-image.jpg',
  } as any);

  const response = await fetch(`${API_BASE_URL}/purchase-orders/${orderId}/main-image`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
    headers: {
      // FormData를 사용할 때는 Content-Type을 설정하지 않음
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '이미지 업로드에 실패했습니다.');
  }

  const responseData = await response.json();
  if (!responseData.success) {
    throw new Error(responseData.error || '이미지 업로드에 실패했습니다.');
  }
}

/**
 * 재발주 생성 (기존 발주를 복사하여 새 발주 생성)
 * @param sourceOrderId 원본 발주 ID
 */
export async function createReorderPurchaseOrder(sourceOrderId: string): Promise<PurchaseOrderDetail> {
  const response = await fetch(`${API_BASE_URL}/purchase-orders/${sourceOrderId}/reorder`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '재발주 생성에 실패했습니다.');
  }

  const responseData = await response.json();
  if (!responseData.success) {
    throw new Error(responseData.error || '재발주 생성에 실패했습니다.');
  }

  const data = responseData.data;
  return {
    id: data.id,
    po_number: data.po_number || '',
    product_name: data.product_name || data.product?.name || '',
    product_name_chinese: data.product_name_chinese || data.product?.name_chinese || null,
    product_main_image: data.product_main_image || data.product?.main_image || null,
    quantity: data.quantity || 0,
    unit_price: data.unit_price || 0,
    back_margin: data.back_margin || 0,
    order_unit_price: data.order_unit_price || (data.unit_price || 0) + (data.back_margin || 0),
    expected_final_unit_price: data.expected_final_unit_price || null,
    order_date: data.order_date || data.date || '',
    delivery_date: data.delivery_date || null,
    order_status: data.order_status || (data.is_confirmed ? '발주확인' : '발주 대기'),
    payment_status: data.payment_status || '미결제',
    size: data.size || data.product_size || data.product?.size || null,
    weight: data.weight || data.product_weight || data.product?.weight || null,
    packaging: data.packaging || data.product_packaging_size || null,
    shipping_cost: data.shipping_cost || 0,
    warehouse_shipping_cost: data.warehouse_shipping_cost || 0,
    commission_rate: data.commission_rate || 0,
    commission_type: data.commission_type || null,
    option_cost: data.option_cost || 0,
    labor_cost: data.labor_cost || 0,
    packing_list_shipping_cost: data.packing_list_shipping_cost || 0,
    factory_shipped_quantity: data.factory_shipped_quantity || 0,
    unshipped_quantity: data.unshipped_quantity || 0,
    shipped_quantity: data.shipped_quantity || 0,
    shipping_quantity: data.shipping_quantity || 0,
    arrived_quantity: data.arrived_quantity || 0,
    unreceived_quantity: data.unreceived_quantity || 0,
    work_start_date: data.work_start_date || null,
    work_end_date: data.work_end_date || null,
    is_confirmed: data.is_confirmed || false,
    advance_payment_rate: data.advance_payment_rate || 0,
    advance_payment_date: data.advance_payment_date || null,
    balance_payment_date: data.balance_payment_date || null,
    supplier: data.supplier,
    product: data.product,
    optionItems: data.optionItems || [],
    laborCostItems: data.laborCostItems || [],
    factoryShipments: data.factoryShipments || [],
    returnExchangeItems: data.returnExchangeItems || [],
    workItems: data.workItems || [],
  };
}

/**
 * 발주 일괄 컨펌 (발주확인 상태로 변경)
 * @param orderIds 발주 ID 배열
 */
export async function confirmPurchaseOrders(orderIds: string[]): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/purchase-orders/batch/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ orderIds }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '발주 컨펌에 실패했습니다.');
  }

  const responseData = await response.json();
  if (!responseData.success) {
    throw new Error(responseData.error || '발주 컨펌에 실패했습니다.');
  }
}

/**
 * 발주 일괄 컨펌 해제 (발주 대기 상태로 변경)
 * @param orderIds 발주 ID 배열
 */
export async function unconfirmPurchaseOrders(orderIds: string[]): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/purchase-orders/batch/unconfirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ orderIds }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '발주 컨펌 해제에 실패했습니다.');
  }

  const responseData = await response.json();
  if (!responseData.success) {
    throw new Error(responseData.error || '발주 컨펌 해제에 실패했습니다.');
  }
}

/**
 * 발주 일괄 삭제
 * @param orderIds 발주 ID 배열
 */
export async function deletePurchaseOrders(orderIds: string[]): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/purchase-orders/batch/delete`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ orderIds }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '발주 삭제에 실패했습니다.');
  }

  const responseData = await response.json();
  if (!responseData.success) {
    throw new Error(responseData.error || '발주 삭제에 실패했습니다.');
  }
}

/**
 * 발주 정보 업데이트
 * @param id 발주 ID
 * @param data 업데이트할 데이터
 */
export interface UpdatePurchaseOrderData {
  unit_price?: number;
  back_margin?: number;
  quantity?: number;
  shipping_cost?: number;
  warehouse_shipping_cost?: number;
  commission_rate?: number;
  commission_type?: string | null;
  advance_payment_rate?: number;
  advance_payment_amount?: number | null;
  advance_payment_date?: string | null;
  balance_payment_amount?: number | null;
  balance_payment_date?: string | null;
  packaging?: number;
  order_date?: string | null;
  estimated_delivery?: string | null;
  work_start_date?: string | null;
  work_end_date?: string | null;
  is_confirmed?: boolean;
  product_name?: string;
  product_size?: string;
  product_weight?: string;
  product_packaging_size?: string;
}

export async function updatePurchaseOrder(
  id: string,
  data: UpdatePurchaseOrderData
): Promise<PurchaseOrderDetail> {
  const response = await fetch(`${API_BASE_URL}/purchase-orders/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '발주 정보 업데이트에 실패했습니다.');
  }

  const responseData = await response.json();
  if (!responseData.success) {
    throw new Error(responseData.error || '발주 정보 업데이트에 실패했습니다.');
  }

  // 응답 데이터를 PurchaseOrderDetail 형식으로 변환
  const result = responseData.data;
  return {
    id: result.id,
    po_number: result.po_number || '',
    product_name: result.product_name || result.product?.name || '',
    product_name_chinese: result.product_name_chinese || result.product?.name_chinese || null,
    product_main_image: result.product_main_image || result.product?.main_image || null,
    quantity: result.quantity || 0,
    unit_price: result.unit_price || 0,
    back_margin: result.back_margin || 0,
    order_unit_price: result.order_unit_price || (result.unit_price || 0) + (result.back_margin || 0),
    expected_final_unit_price: result.expected_final_unit_price || null,
    order_date: result.order_date || result.date || '',
    delivery_date: result.delivery_date || null,
    order_status: result.order_status || (result.is_confirmed ? '발주확인' : '발주 대기'),
    payment_status: result.payment_status || '미결제',
    size: result.size || result.product_size || result.product?.size || null,
    weight: result.weight || result.product_weight || result.product?.weight || null,
    packaging: result.packaging || result.product_packaging_size || null,
    shipping_cost: result.shipping_cost || 0,
    warehouse_shipping_cost: result.warehouse_shipping_cost || 0,
    commission_rate: result.commission_rate || 0,
    commission_type: result.commission_type || null,
    option_cost: result.option_cost || 0,
    labor_cost: result.labor_cost || 0,
    packing_list_shipping_cost: result.packing_list_shipping_cost || 0,
    factory_shipped_quantity: result.factory_shipped_quantity || 0,
    unshipped_quantity: result.unshipped_quantity || 0,
    shipped_quantity: result.shipped_quantity || 0,
    shipping_quantity: result.shipping_quantity || 0,
    arrived_quantity: result.arrived_quantity || 0,
    unreceived_quantity: result.unreceived_quantity || 0,
    work_start_date: result.work_start_date || null,
    work_end_date: result.work_end_date || null,
    is_confirmed: result.is_confirmed || false,
    advance_payment_rate: result.advance_payment_rate || 0,
    advance_payment_date: result.advance_payment_date || null,
    balance_payment_date: result.balance_payment_date || null,
    supplier: result.supplier,
    product: result.product,
    optionItems: result.optionItems || [],
    laborCostItems: result.laborCostItems || [],
    factoryShipments: result.factoryShipments || [],
    returnExchangeItems: result.returnExchangeItems || [],
    workItems: result.workItems || [],
  };
}

/**
 * 비용 항목 (옵션/인건비) 업데이트
 * @param orderId 발주 ID
 * @param items 비용 항목 배열
 * @param userLevel 사용자 레벨
 */
export interface CostItem {
  item_type: 'option' | 'labor';
  name: string;
  unit_price: number;
  quantity: number;
  is_admin_only?: boolean;
  display_order?: number;
}

export async function updatePurchaseOrderCostItems(
  orderId: string,
  items: CostItem[],
  userLevel?: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/purchase-orders/${orderId}/cost-items`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ items, userLevel }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '비용 항목 저장에 실패했습니다.');
  }

  const responseData = await response.json();
  if (!responseData.success) {
    throw new Error(responseData.error || '비용 항목 저장에 실패했습니다.');
  }
}

/**
 * 비용 항목 조회
 * @param orderId 발주 ID
 */
export interface CostItemResponse {
  id: number;
  item_type: 'option' | 'labor';
  name: string;
  unit_price: number;
  quantity: number;
  is_admin_only: boolean;
  display_order: number;
}

export async function getPurchaseOrderCostItems(
  orderId: string
): Promise<{ optionItems: CostItemResponse[]; laborCostItems: CostItemResponse[] }> {
  const response = await fetch(`${API_BASE_URL}/purchase-orders/${orderId}/cost-items`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '비용 항목 조회에 실패했습니다.');
  }

  const responseData = await response.json();
  if (!responseData.success) {
    throw new Error(responseData.error || '비용 항목 조회에 실패했습니다.');
  }

  const items: CostItemResponse[] = responseData.data || [];
  return {
    optionItems: items.filter((item) => item.item_type === 'option'),
    laborCostItems: items.filter((item) => item.item_type === 'labor'),
  };
}

/**
 * 업체 출고 항목 저장
 * @param orderId 발주 ID
 * @param shipments 출고 항목 배열
 */
export interface FactoryShipmentData {
  id?: number;
  shipment_date: string | null;
  quantity: number;
  tracking_number?: string | null;
  receive_date?: string | null;
  display_order: number;
}

export async function updateFactoryShipments(
  orderId: string,
  shipments: FactoryShipmentData[]
): Promise<number[]> {
  const response = await fetch(`${API_BASE_URL}/purchase-orders/${orderId}/factory-shipments`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ shipments }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '업체 출고 항목 저장에 실패했습니다.');
  }

  const responseData = await response.json();
  if (!responseData.success) {
    throw new Error(responseData.error || '업체 출고 항목 저장에 실패했습니다.');
  }

  return responseData.data || [];
}

/**
 * 반품/교환 항목 저장
 * @param orderId 발주 ID
 * @param items 반품/교환 항목 배열
 */
export interface ReturnExchangeData {
  id?: number;
  return_date: string | null;
  quantity: number;
  tracking_number?: string | null;
  receive_date?: string | null;
  reason?: string | null;
  display_order: number;
}

export async function updateReturnExchanges(
  orderId: string,
  items: ReturnExchangeData[]
): Promise<number[]> {
  const response = await fetch(`${API_BASE_URL}/purchase-orders/${orderId}/return-exchanges`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ items }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '반품/교환 항목 저장에 실패했습니다.');
  }

  const responseData = await response.json();
  if (!responseData.success) {
    throw new Error(responseData.error || '반품/교환 항목 저장에 실패했습니다.');
  }

  return responseData.data || [];
}

/**
 * 이미지 업로드 (업체 출고 또는 반품/교환)
 * @param orderId 발주 ID
 * @param type 이미지 타입 ('factory-shipment' | 'return-exchange')
 * @param relatedId 관련 항목 ID
 * @param images 이미지 파일 배열
 */
export async function uploadPurchaseOrderImages(
  orderId: string,
  type: 'factory-shipment' | 'return-exchange',
  relatedId: number,
  images: Array<{ uri: string; type: string; name: string }>
): Promise<void> {
  const formData = new FormData();
  
  for (const image of images) {
    // React Native의 uri를 File 객체로 변환
    const file = {
      uri: image.uri,
      type: image.type || 'image/jpeg',
      name: image.name || `image_${Date.now()}.jpg`,
    } as any;
    formData.append('images', file);
  }

  const response = await fetch(`${API_BASE_URL}/purchase-orders/${orderId}/images/${type}/${relatedId}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
    headers: {
      // FormData를 사용할 때는 Content-Type을 설정하지 않음
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '이미지 업로드에 실패했습니다.');
  }

  const responseData = await response.json();
  if (!responseData.success) {
    throw new Error(responseData.error || '이미지 업로드에 실패했습니다.');
  }
}

/**
 * 이미지 URL을 전체 URL로 변환
 * (constants에서 export된 getFullImageUrl 사용)
 */
export { getFullImageUrl };

