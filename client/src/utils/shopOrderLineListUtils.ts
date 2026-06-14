import type { ShopOrderLine } from '../api/shopOrderApi';
import type { ShopOrderLineListRow } from './shopOrderListExport';

export type ShopOrderLineProgressStatus = '출고대기' | '배송중' | '정산중' | '완료';

export interface ShopOrderLineFulfillmentFilters {
  noStatement: boolean;
  noPayment: boolean;
  notArrived: boolean;
  noTaxInvoice: boolean;
  noTracking: boolean;
}

export const EMPTY_LINE_FULFILLMENT_FILTERS: ShopOrderLineFulfillmentFilters = {
  noStatement: false,
  noPayment: false,
  notArrived: false,
  noTaxInvoice: false,
  noTracking: false,
};

export function lineHasStatement(line: ShopOrderLine): boolean {
  return line.statementIssued || Boolean(line.statementFilePath);
}

export function lineHasPayment(line: ShopOrderLine): boolean {
  return line.paymentReceived || Boolean(line.paymentProofImage);
}

export function lineHasTracking(line: ShopOrderLine): boolean {
  return Boolean(line.trackingNumber?.trim());
}

export function deriveLineProgressStatus(line: ShopOrderLine): ShopOrderLineProgressStatus {
  const arrived = line.productArrived;
  const paid = lineHasPayment(line);
  const taxDone = line.taxInvoiceIssued;
  const hasTracking = lineHasTracking(line);

  if (arrived && paid && taxDone) {
    return '완료';
  }
  if (arrived) {
    return '정산중';
  }
  if (hasTracking) {
    return '배송중';
  }
  return '출고대기';
}

export function getLineProgressStatusClass(status: ShopOrderLineProgressStatus): string {
  switch (status) {
    case '출고대기':
      return 'bg-gray-100 text-gray-700';
    case '배송중':
      return 'bg-blue-100 text-blue-700';
    case '정산중':
      return 'bg-amber-100 text-amber-800';
    case '완료':
      return 'bg-green-100 text-green-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export function formatLineOrderRef(orderNumber: string, lineIndex: number): string {
  return `${orderNumber}-${lineIndex}`;
}

export function formatLineQuantity(line: ShopOrderLine): string {
  const pieces = line.orderBoxCount * line.quantityPerBox;
  if (line.orderBoxCount <= 0 && pieces <= 0) {
    return '-';
  }
  if (line.quantityPerBox <= 0) {
    return `${line.orderBoxCount.toLocaleString()}박스`;
  }
  return `${pieces.toLocaleString()}개 (${line.orderBoxCount}×${line.quantityPerBox})`;
}

export function matchesLineFulfillmentFilters(
  row: ShopOrderLineListRow,
  filters: ShopOrderLineFulfillmentFilters
): boolean {
  const { line } = row;

  if (filters.noStatement && lineHasStatement(line)) return false;
  if (filters.noPayment && lineHasPayment(line)) return false;
  if (filters.notArrived && line.productArrived) return false;
  if (filters.noTaxInvoice && line.taxInvoiceIssued) return false;
  if (filters.noTracking && lineHasTracking(line)) return false;

  return true;
}

export function matchesLineDateRange(
  orderDate: string | null,
  dateFrom: string,
  dateTo: string
): boolean {
  if (!dateFrom && !dateTo) return true;
  if (!orderDate) return false;

  const normalized = orderDate.slice(0, 10);
  if (dateFrom && normalized < dateFrom) return false;
  if (dateTo && normalized > dateTo) return false;
  return true;
}

export function hasActiveLineFulfillmentFilters(filters: ShopOrderLineFulfillmentFilters): boolean {
  return Object.values(filters).some(Boolean);
}
