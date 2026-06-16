import { getApiBaseUrl } from './baseUrl';

const API_BASE_URL = getApiBaseUrl();

export type ShopShipmentDeliveryStatus = 'before_start' | 'in_transit' | 'delivered';

export interface ShopShipmentListRow {
  shipmentLineId: string;
  shipmentId: string;
  shipmentDate: string;
  trackingNumber: string;
  logisticsCompany: string;
  deliveryStatus: ShopShipmentDeliveryStatus;
  shipmentBoxCount: number | null;
  deliveryFee: number | null;
  boxPrice: number | null;
  lastTrackingKind: string | null;
  lastTrackingAt: string | null;
  shopOrderId: string;
  lineId: string;
  orderNumber: string;
  productName: string;
  orderDate: string | null;
  lineOrderNumber: string | null;
  lineIndex: number;
  isReservation: boolean;
  companyName: string | null;
  recipientName: string | null;
  phoneNumber: string | null;
  address: string | null;
  orderBoxCount: number;
  quantityPerBox: number;
}

export interface ShopShipmentBatchShipmentItem {
  shipmentId: string;
  trackingNumber: string;
  logisticsCompany: string;
  deliveryStatus: ShopShipmentDeliveryStatus;
  lastTrackingKind: string | null;
  lastTrackingAt: string | null;
}

export interface ShopShipmentBatchLineItem {
  lineId: string;
  shopOrderId: string;
  orderNumber: string;
  productName: string;
  lineOrderNumber: string | null;
  lineIndex: number;
  companyName: string | null;
  orderBoxCount: number;
  quantityPerBox: number;
}

export interface ShopShipmentBatchListItem {
  batchId: string;
  shipmentDate: string;
  recipientName: string | null;
  phoneNumber: string | null;
  address: string | null;
  shipmentBoxCount: number | null;
  deliveryFee: number | null;
  boxPrice: number | null;
  logisticsFeePaid: boolean;
  logisticsFeePaidAt: string | null;
  shipments: ShopShipmentBatchShipmentItem[];
  lineItems: ShopShipmentBatchLineItem[];
}

export interface CreateShopShipmentBatchPayload {
  shipmentDate: string;
  shipments: Array<{
    trackingNumber: string;
    lineItems: Array<{ shopOrderId: string; lineId: string }>;
    shipmentBoxCount?: number | null;
    deliveryFee?: number | null;
    boxPrice?: number | null;
  }>;
}

export async function getShopShipmentRows(): Promise<ShopShipmentListRow[]> {
  const response = await fetch(`${API_BASE_URL}/shop-shipments/rows`, { credentials: 'include' });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '배송 목록을 불러오지 못했습니다.');
  }
  return data.data as ShopShipmentListRow[];
}

export async function getShopShipmentBatches(): Promise<ShopShipmentBatchListItem[]> {
  const response = await fetch(`${API_BASE_URL}/shop-shipments/batches`, { credentials: 'include' });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '배송 묶음 목록을 불러오지 못했습니다.');
  }
  return data.data as ShopShipmentBatchListItem[];
}

export async function getShopShipmentAssignedLineIds(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/shop-shipments/assigned-line-ids`, {
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '배송 할당 주문건을 불러오지 못했습니다.');
  }
  return data.data as string[];
}

export async function createShopShipmentBatch(
  payload: CreateShopShipmentBatchPayload
): Promise<{ batchId: string }> {
  const response = await fetch(`${API_BASE_URL}/shop-shipments/batches`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '송장 등록에 실패했습니다.');
  }
  return data.data as { batchId: string };
}

export async function updateShopShipmentBatch(
  batchId: string,
  payload: {
    shipmentBoxCount?: number | null;
    deliveryFee?: number | null;
    boxPrice?: number | null;
    logisticsFeePaid?: boolean;
  }
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/shop-shipments/batches/${batchId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '배송 정보 저장에 실패했습니다.');
  }
}

export async function updateShopShipment(
  shipmentId: string,
  payload: {
    shipmentBoxCount?: number | null;
    deliveryFee?: number | null;
    boxPrice?: number | null;
  }
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/shop-shipments/${shipmentId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '송장 정보 저장에 실패했습니다.');
  }
}

export async function lookupShopShipmentTracking(shipmentId: string): Promise<{
  deliveryStatus: ShopShipmentDeliveryStatus;
  lastTrackingKind: string;
  lastTrackingAt: string | null;
  updatedLineIds: string[];
}> {
  const response = await fetch(`${API_BASE_URL}/shop-shipments/shipments/${shipmentId}/tracking-lookup`, {
    method: 'POST',
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '배송 조회에 실패했습니다.');
  }
  return data.data;
}

export async function deleteShopShipmentBatch(batchId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/shop-shipments/batches/${batchId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '배송 묶음 삭제에 실패했습니다.');
  }
}

export async function deleteShopShipment(shipmentId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/shop-shipments/${shipmentId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '송장 삭제에 실패했습니다.');
  }
}

export function getShopShipmentDeliveryStatusLabel(status: ShopShipmentDeliveryStatus): string {
  switch (status) {
    case 'before_start':
      return '배송시작전';
    case 'in_transit':
      return '배송중';
    case 'delivered':
      return '배송완료';
    default:
      return status;
  }
}
