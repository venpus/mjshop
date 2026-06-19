import type { ShopOrder, ShopOrderLine } from '../api/shopOrderApi';
import type { ShopOrderLineListRow } from './shopOrderListExport';

export type ShopOrderLineProgressStatus = '출고대기' | '배송중' | '정산중' | '완료';

export interface ShopOrderLineFulfillmentFilters {
  noStatement: boolean;
  noPayment: boolean;
  notArrived: boolean;
  noTaxInvoice: boolean;
  noTracking: boolean;
  shippingReady: boolean;
}

export const EMPTY_LINE_FULFILLMENT_FILTERS: ShopOrderLineFulfillmentFilters = {
  noStatement: false,
  noPayment: false,
  notArrived: false,
  noTaxInvoice: false,
  noTracking: false,
  shippingReady: false,
};

export function lineHasStatement(line: ShopOrderLine): boolean {
  return line.statementIssued || Boolean(line.statementFilePath);
}

export function lineHasStatementDelivered(line: ShopOrderLine): boolean {
  return line.statementDelivered;
}

export function lineHasPayment(line: ShopOrderLine): boolean {
  return line.paymentReceived || Boolean(line.paymentProofImage);
}

export function lineHasTracking(line: ShopOrderLine): boolean {
  return Boolean(line.trackingNumber?.trim());
}

export interface LineRemovalStatementPolicy {
  blocked: boolean;
  blockReason: string | null;
  groupSize: number;
  remainingCount: number;
  willRegenerateGroup: boolean;
}

export function getLinesInStatementGroup(
  orders: ShopOrder[],
  groupId: string | null | undefined
): ShopOrderLine[] {
  if (!groupId) {
    return [];
  }

  const lines: ShopOrderLine[] = [];
  for (const order of orders) {
    for (const line of order.lines) {
      if (line.statementGroupId === groupId) {
        lines.push(line);
      }
    }
  }
  return lines;
}

function lineBlocksGroupStatementRemoval(line: ShopOrderLine): boolean {
  return line.statementDelivered || lineHasPayment(line);
}

export function analyzeLineRemovalStatementPolicy(
  line: ShopOrderLine,
  orders: ShopOrder[]
): LineRemovalStatementPolicy {
  const groupId = line.statementGroupId;
  const hasStatement = lineHasStatement(line);

  if (!groupId || !hasStatement) {
    return {
      blocked: false,
      blockReason: null,
      groupSize: 1,
      remainingCount: 0,
      willRegenerateGroup: false,
    };
  }

  const groupLines = getLinesInStatementGroup(orders, groupId);
  const groupSize = groupLines.length;

  if (groupSize <= 1) {
    return {
      blocked: false,
      blockReason: null,
      groupSize,
      remainingCount: 0,
      willRegenerateGroup: false,
    };
  }

  if (groupLines.some(lineBlocksGroupStatementRemoval)) {
    return {
      blocked: true,
      blockReason:
        '입금 또는 명세서 전달이 완료된 통합 명세서에 포함된 주문 건은 단독 제거할 수 없습니다.',
      groupSize,
      remainingCount: groupSize - 1,
      willRegenerateGroup: false,
    };
  }

  return {
    blocked: false,
    blockReason: null,
    groupSize,
    remainingCount: groupSize - 1,
    willRegenerateGroup: true,
  };
}

/** 송장 입력 전 출고준비 단계인지 (체크박스 표시·편집 대상) */
export function lineInPreShipmentPhase(line: ShopOrderLine): boolean {
  return !lineHasTracking(line);
}

/** 출고준비 필터: 송장 없음 + 출고준비 체크된 건만 */
export function lineMatchesShippingReadyFilter(line: ShopOrderLine): boolean {
  return lineInPreShipmentPhase(line) && line.shippingReady;
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

export function formatLineOrderRef(
  lineOrderNumber: string | null | undefined,
  orderNumber: string,
  lineIndex: number,
  kindPrefix?: '예약'
): string {
  if (lineOrderNumber?.trim()) {
    return lineOrderNumber.trim();
  }
  if (kindPrefix) {
    return `${orderNumber}-${kindPrefix}${lineIndex}`;
  }
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
  if (filters.shippingReady && !lineMatchesShippingReadyFilter(line)) return false;

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

function normalizeLineListSortField(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function compareShopOrderLineRowsByCompanyAddress(
  a: ShopOrderLineListRow,
  b: ShopOrderLineListRow
): number {
  const companyCompare = normalizeLineListSortField(a.line.companyName).localeCompare(
    normalizeLineListSortField(b.line.companyName),
    'ko'
  );
  if (companyCompare !== 0) return companyCompare;

  const addressCompare = normalizeLineListSortField(a.line.address).localeCompare(
    normalizeLineListSortField(b.line.address),
    'ko'
  );
  if (addressCompare !== 0) return addressCompare;

  const orderCompare = a.orderNumber.localeCompare(b.orderNumber, 'ko');
  if (orderCompare !== 0) return orderCompare;

  return a.lineIndex - b.lineIndex;
}

export function sortShopOrderLineRowsByCompanyAddress(
  rows: ShopOrderLineListRow[]
): ShopOrderLineListRow[] {
  return [...rows].sort(compareShopOrderLineRowsByCompanyAddress);
}
