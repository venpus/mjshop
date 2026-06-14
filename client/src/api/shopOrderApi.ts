import { getApiBaseUrl } from './baseUrl';

const API_BASE_URL = getApiBaseUrl();

export type ShopOrderStatus = '판매대기' | '판매중' | '품절' | '판매완료';

export interface ShopOrderLine {
  id: string;
  lineOrderNumber: string | null;
  shopOrderId: string;
  sortOrder: number;
  isReservation: boolean;
  companyName: string | null;
  orderBoxCount: number;
  quantityPerBox: number;
  saleUnitPrice: number | null;
  deliveryFee: number | null;
  productSupplyAmount: number | null;
  vatAmount: number | null;
  totalAmount: number | null;
  address: string | null;
  recipientName: string | null;
  phoneNumber: string | null;
  trackingNumber: string | null;
  statementIssued: boolean;
  paymentReceived: boolean;
  productArrived: boolean;
  taxInvoiceIssued: boolean;
  cnyExchangeRate: number | null;
  wkSettlementPaid: boolean;
  inventioSettlementPaid: boolean;
  shipmentBoxCount: number | null;
  logisticsFeePaid: boolean;
  logisticsFeePaidAt: string | null;
  wkSettlementPaidAt: string | null;
  inventioSettlementPaidAt: string | null;
  statementFilePath: string | null;
  paymentProofImage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShopOrder {
  id: string;
  orderNumber: string;
  stockInboundItemId: number | null;
  purchaseOrderId: string | null;
  productId: string | null;
  productName: string;
  productMainImage: string | null;
  unitPrice: number | null;
  quantity: number;
  stockQuantity: number;
  warehouseStockQuantity: number;
  sellingPrice: number | null;
  status: ShopOrderStatus;
  orderDate: string | null;
  note: string | null;
  quantityPerBox: number;
  lines: ShopOrderLine[];
  lineCount: number;
  totalSalesAmount: number;
  totalProductSupplyAmount: number;
  createdAt: string;
  updatedAt: string;
}

function mapOptionalIsoDate(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  return String(raw);
}

function mapShopOrderLine(raw: Record<string, unknown>): ShopOrderLine {
  return {
    id: String(raw.id),
    lineOrderNumber: raw.lineOrderNumber != null ? String(raw.lineOrderNumber) : null,
    shopOrderId: String(raw.shopOrderId),
    sortOrder: Number(raw.sortOrder) || 0,
    isReservation: Boolean(raw.isReservation),
    companyName: raw.companyName != null ? String(raw.companyName) : null,
    orderBoxCount: Number(raw.orderBoxCount) || 0,
    quantityPerBox: Number(raw.quantityPerBox) || 0,
    saleUnitPrice: raw.saleUnitPrice != null ? Number(raw.saleUnitPrice) : null,
    deliveryFee: raw.deliveryFee != null ? Number(raw.deliveryFee) : null,
    productSupplyAmount:
      raw.productSupplyAmount != null ? Number(raw.productSupplyAmount) : null,
    vatAmount: raw.vatAmount != null ? Number(raw.vatAmount) : null,
    totalAmount: raw.totalAmount != null ? Number(raw.totalAmount) : null,
    address: raw.address != null ? String(raw.address) : null,
    recipientName: raw.recipientName != null ? String(raw.recipientName) : null,
    phoneNumber: raw.phoneNumber != null ? String(raw.phoneNumber) : null,
    trackingNumber: raw.trackingNumber != null ? String(raw.trackingNumber) : null,
    statementIssued: Boolean(raw.statementIssued),
    paymentReceived: Boolean(raw.paymentReceived),
    productArrived: Boolean(raw.productArrived),
    taxInvoiceIssued: Boolean(raw.taxInvoiceIssued),
    cnyExchangeRate: raw.cnyExchangeRate != null ? Number(raw.cnyExchangeRate) : null,
    wkSettlementPaid: Boolean(raw.wkSettlementPaid),
    inventioSettlementPaid: Boolean(raw.inventioSettlementPaid),
    shipmentBoxCount: raw.shipmentBoxCount != null ? Number(raw.shipmentBoxCount) : null,
    logisticsFeePaid: Boolean(raw.logisticsFeePaid),
    logisticsFeePaidAt: mapOptionalIsoDate(raw.logisticsFeePaidAt),
    wkSettlementPaidAt: mapOptionalIsoDate(raw.wkSettlementPaidAt),
    inventioSettlementPaidAt: mapOptionalIsoDate(raw.inventioSettlementPaidAt),
    statementFilePath:
      raw.statementFilePath != null ? String(raw.statementFilePath) : null,
    paymentProofImage:
      raw.paymentProofImage != null ? String(raw.paymentProofImage) : null,
    createdAt: String(raw.createdAt),
    updatedAt: String(raw.updatedAt),
  };
}

function mapShopOrder(raw: Record<string, unknown>): ShopOrder {
  const lines = Array.isArray(raw.lines)
    ? raw.lines.map((line) => mapShopOrderLine(line as Record<string, unknown>))
    : [];

  return {
    id: String(raw.id),
    orderNumber: String(raw.orderNumber),
    stockInboundItemId: raw.stockInboundItemId != null ? Number(raw.stockInboundItemId) : null,
    purchaseOrderId: raw.purchaseOrderId != null ? String(raw.purchaseOrderId) : null,
    productId: raw.productId != null ? String(raw.productId) : null,
    productName: String(raw.productName),
    productMainImage: raw.productMainImage != null ? String(raw.productMainImage) : null,
    unitPrice: raw.unitPrice != null ? Number(raw.unitPrice) : null,
    quantity: Number(raw.quantity) || 0,
    stockQuantity: Number(raw.stockQuantity) || 0,
    warehouseStockQuantity:
      raw.warehouseStockQuantity != null
        ? Number(raw.warehouseStockQuantity)
        : Number(raw.stockQuantity) || 0,
    sellingPrice: raw.sellingPrice != null ? Number(raw.sellingPrice) : null,
    status: raw.status as ShopOrderStatus,
    orderDate: raw.orderDate != null ? String(raw.orderDate).split('T')[0] : null,
    note: raw.note != null ? String(raw.note) : null,
    quantityPerBox: Number(raw.quantityPerBox) || 0,
    lines,
    lineCount: lines.length > 0 ? lines.length : Number(raw.lineCount) || 0,
    totalSalesAmount:
      lines.length > 0
        ? lines.reduce((sum, line) => sum + (line.totalAmount ?? 0), 0)
        : Number(raw.totalSalesAmount) || 0,
    totalProductSupplyAmount:
      lines.length > 0
        ? lines.reduce((sum, line) => sum + (line.productSupplyAmount ?? 0), 0)
        : Number(raw.totalProductSupplyAmount) || 0,
    createdAt: String(raw.createdAt),
    updatedAt: String(raw.updatedAt),
  };
}

export interface SyncShopOrderDetailPayload {
  sellingPrice?: number | null;
  quantityPerBox?: number;
  lines?: Array<{
    id: string;
    companyName?: string | null;
    orderBoxCount?: number;
    quantityPerBox?: number;
    saleUnitPrice?: number | null;
    deliveryFee?: number | null;
    address?: string | null;
    recipientName?: string | null;
    phoneNumber?: string | null;
    trackingNumber?: string | null;
    productArrived?: boolean;
    taxInvoiceIssued?: boolean;
  }>;
}

export async function getShopOrders(): Promise<ShopOrder[]> {
  const response = await fetch(`${API_BASE_URL}/shop-orders`, { credentials: 'include' });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || '주문 목록을 불러오지 못했습니다.');
  }
  const data = await response.json();
  return (data.data as Record<string, unknown>[]).map(mapShopOrder);
}

export async function getShopOrderById(id: string): Promise<ShopOrder> {
  const response = await fetch(`${API_BASE_URL}/shop-orders/${id}`, { credentials: 'include' });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || '주문 정보를 불러오지 못했습니다.');
  }
  const data = await response.json();
  return mapShopOrder(data.data);
}

export async function createShopOrderFromInbound(
  stockInboundItemId: number
): Promise<{ order: ShopOrder; created: boolean }> {
  const response = await fetch(`${API_BASE_URL}/shop-orders/from-inbound`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ stockInboundItemId }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '주문 등록에 실패했습니다.');
  }

  return {
    order: mapShopOrder(data.data),
    created: Boolean(data.created),
  };
}

export async function syncShopOrderDetail(
  id: string,
  payload: SyncShopOrderDetailPayload
): Promise<ShopOrder> {
  const response = await fetch(`${API_BASE_URL}/shop-orders/${id}/detail`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '주문 저장에 실패했습니다.');
  }

  return mapShopOrder(data.data);
}

export async function addShopOrderLine(
  id: string,
  options?: { isReservation?: boolean }
): Promise<ShopOrder> {
  const response = await fetch(`${API_BASE_URL}/shop-orders/${id}/lines`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isReservation: options?.isReservation ?? false }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      data.error ||
        (options?.isReservation ? '예약 추가에 실패했습니다.' : '주문 추가에 실패했습니다.')
    );
  }
  return mapShopOrder(data.data);
}

export async function deleteShopOrder(orderId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/shop-orders/${orderId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '제품 주문 삭제에 실패했습니다.');
  }
}

export async function deleteShopOrderLine(orderId: string, lineId: string): Promise<ShopOrder> {
  const response = await fetch(`${API_BASE_URL}/shop-orders/${orderId}/lines/${lineId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '주문 삭제에 실패했습니다.');
  }
  return mapShopOrder(data.data);
}

export async function convertShopOrderLineToReservation(
  orderId: string,
  lineId: string
): Promise<ShopOrder> {
  const response = await fetch(
    `${API_BASE_URL}/shop-orders/${orderId}/lines/${lineId}/convert-to-reservation`,
    {
      method: 'POST',
      credentials: 'include',
    }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '예약 전환에 실패했습니다.');
  }
  return mapShopOrder(data.data);
}

export async function convertShopOrderLineToOrder(
  orderId: string,
  lineId: string
): Promise<ShopOrder> {
  const response = await fetch(
    `${API_BASE_URL}/shop-orders/${orderId}/lines/${lineId}/convert-to-order`,
    {
      method: 'POST',
      credentials: 'include',
    }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '주문 전환에 실패했습니다.');
  }
  return mapShopOrder(data.data);
}

export interface ShopOrderReservationTransferTarget {
  id: string;
  orderNumber: string;
  productName: string;
  productMainImage: string | null;
  warehouseStockQuantity: number;
  stockQuantity: number;
  status: ShopOrderStatus;
}

export async function getShopOrderReservationTransferTargets(
  excludeShopOrderIds: string[] = [],
  productName?: string
): Promise<ShopOrderReservationTransferTarget[]> {
  const params = new URLSearchParams();
  for (const orderId of excludeShopOrderIds) {
    if (orderId) params.append('excludeShopOrderId', orderId);
  }
  const trimmedProductName = productName?.trim();
  if (trimmedProductName) {
    params.set('productName', trimmedProductName);
  }
  const query = params.toString();
  const response = await fetch(
    `${API_BASE_URL}/shop-orders/reservation-transfer-targets${query ? `?${query}` : ''}`,
    { credentials: 'include' }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '옮길 주문 목록을 불러오지 못했습니다.');
  }
  return (data.data as Record<string, unknown>[]).map((raw) => ({
    id: String(raw.id),
    orderNumber: String(raw.orderNumber),
    productName: String(raw.productName),
    productMainImage: raw.productMainImage != null ? String(raw.productMainImage) : null,
    warehouseStockQuantity: Number(raw.warehouseStockQuantity) || 0,
    stockQuantity: Number(raw.stockQuantity) || 0,
    status: raw.status as ShopOrderStatus,
  }));
}

export interface TransferReservationsResult {
  transferredCount: number;
  targetOrderId: string;
}

export async function transferShopOrderReservationsToOrder(
  targetShopOrderId: string,
  items: Array<{ shopOrderId: string; lineId: string }>
): Promise<TransferReservationsResult> {
  const response = await fetch(`${API_BASE_URL}/shop-orders/reservations/transfer`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetShopOrderId, items }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '주문 이동에 실패했습니다.');
  }
  return data.data as TransferReservationsResult;
}

export async function createShopOrderStatement(
  orderId: string,
  lineId: string
): Promise<ShopOrder> {
  const response = await fetch(
    `${API_BASE_URL}/shop-orders/${orderId}/lines/${lineId}/statement`,
    {
      method: 'POST',
      credentials: 'include',
    }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '명세서 생성에 실패했습니다.');
  }
  return mapShopOrder(data.data);
}

export interface ShopOrderBulkStatementGroup {
  groupKey: string;
  companyName: string;
  lineCount: number;
  html: string;
  fileName: string;
}

export interface ShopOrderBulkStatementResult {
  groups: ShopOrderBulkStatementGroup[];
  statementCount: number;
}

export async function createShopOrderBulkStatements(
  orderIds: string[]
): Promise<ShopOrderBulkStatementResult> {
  const response = await fetch(`${API_BASE_URL}/shop-orders/bulk/statements`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderIds }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '명세서 생성에 실패했습니다.');
  }
  return data.data as ShopOrderBulkStatementResult;
}

export interface CancelShopOrderStatementsResult {
  cancelledCount: number;
}

export async function cancelShopOrderStatements(
  items: Array<{ shopOrderId: string; lineId: string }>
): Promise<CancelShopOrderStatementsResult> {
  const response = await fetch(`${API_BASE_URL}/shop-orders/statements/cancel`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '명세서 취소에 실패했습니다.');
  }
  return data.data as CancelShopOrderStatementsResult;
}

export async function getShopOrderStatementPreview(
  orderId: string,
  lineId: string
): Promise<{ html: string; fileName: string }> {
  const response = await fetch(
    `${API_BASE_URL}/shop-orders/${orderId}/lines/${lineId}/statement/preview`,
    { credentials: 'include' }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '명세서 미리보기에 실패했습니다.');
  }
  return data.data;
}

export async function downloadShopOrderStatement(
  orderId: string,
  lineId: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/shop-orders/${orderId}/lines/${lineId}/statement/download`,
    { credentials: 'include' }
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || '명세서 다운로드에 실패했습니다.');
  }
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
  const fileName = decodeURIComponent(match?.[1] || match?.[2] || 'statement.html');
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function uploadShopOrderPaymentProof(
  orderId: string,
  lineId: string,
  file: File
): Promise<ShopOrder> {
  const formData = new FormData();
  formData.append('image', file);
  const response = await fetch(
    `${API_BASE_URL}/shop-orders/${orderId}/lines/${lineId}/payment-proof`,
    {
      method: 'POST',
      credentials: 'include',
      body: formData,
    }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '입금 내역 업로드에 실패했습니다.');
  }
  return mapShopOrder(data.data);
}

export async function deleteShopOrderPaymentProof(
  orderId: string,
  lineId: string
): Promise<ShopOrder> {
  const response = await fetch(
    `${API_BASE_URL}/shop-orders/${orderId}/lines/${lineId}/payment-proof`,
    {
      method: 'DELETE',
      credentials: 'include',
    }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '입금 내역 삭제에 실패했습니다.');
  }
  return mapShopOrder(data.data);
}

export async function updateShopOrderLineCnyExchangeRate(
  orderId: string,
  lineId: string,
  cnyExchangeRate: number | null
): Promise<ShopOrderLine> {
  const response = await fetch(
    `${API_BASE_URL}/shop-orders/${orderId}/lines/${lineId}/cny-exchange-rate`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cnyExchangeRate }),
    }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '환율 저장에 실패했습니다.');
  }
  return mapShopOrderLine(data.data as Record<string, unknown>);
}

export async function updateShopOrderLineSettlementPayment(
  orderId: string,
  lineId: string,
  payload: {
    wkSettlementPaid?: boolean;
    inventioSettlementPaid?: boolean;
    logisticsFeePaid?: boolean;
  }
): Promise<ShopOrderLine> {
  const response = await fetch(
    `${API_BASE_URL}/shop-orders/${orderId}/lines/${lineId}/settlement-payment`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '정산 지불 상태 저장에 실패했습니다.');
  }
  return mapShopOrderLine(data.data as Record<string, unknown>);
}

export async function updateShopOrderLineShipmentBoxCount(
  orderId: string,
  lineId: string,
  shipmentBoxCount: number | null
): Promise<ShopOrderLine> {
  const response = await fetch(
    `${API_BASE_URL}/shop-orders/${orderId}/lines/${lineId}/shipment-box-count`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shipmentBoxCount }),
    }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '송장 박스수 저장에 실패했습니다.');
  }
  return mapShopOrderLine(data.data as Record<string, unknown>);
}

export const SHOP_ORDER_STATUS_OPTIONS: ShopOrderStatus[] = [
  '판매대기',
  '판매중',
  '품절',
  '판매완료',
];

export function getShopOrderStatusClass(status: ShopOrderStatus): string {
  switch (status) {
    case '판매완료':
      return 'bg-green-100 text-green-800';
    case '판매중':
      return 'bg-blue-100 text-blue-800';
    case '품절':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-yellow-100 text-yellow-800';
  }
}

export function getShopOrderLineCount(order: ShopOrder): number {
  return order.lines.length;
}
