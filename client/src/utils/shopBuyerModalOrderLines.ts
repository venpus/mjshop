import type { ShopOrder } from '../api/shopOrderApi';
import type { ShopOrderLineListRow } from './shopOrderListExport';
import { buildShopOrderLineListRows } from './shopOrderListExport';
import {
  deriveLineProgressStatus,
  formatLineOrderRef,
  formatLineQuantity,
  type ShopOrderLineProgressStatus,
} from './shopOrderLineListUtils';
import { normalizeShopBuyerCompanyName } from './shopBuyerDisplay';
import {
  deriveLineDeliveryDisplay,
  getLineShipmentInfo,
  type LineShipmentInfo,
} from './shopLineShipmentUtils';

export type BuyerModalOrderLineTab = 'pending_shipment' | 'in_progress' | 'completed';

export interface BuyerModalOrderLine {
  rowKey: string;
  shopOrderId: string;
  lineId: string;
  orderRef: string;
  productName: string;
  quantityLabel: string;
  inboundDate: string | null;
  /** 메신저 복사용 출고예정일 (한국도착 예상) */
  outboundScheduledDate: string | null;
  progressStatus: ShopOrderLineProgressStatus;
  tab: BuyerModalOrderLineTab;
}

export interface BuyerModalOrderLineGroups {
  pendingShipment: BuyerModalOrderLine[];
  inProgress: BuyerModalOrderLine[];
  completed: BuyerModalOrderLine[];
}

function isLineDeliveryUnregistered(
  lineShipmentMap: Map<string, LineShipmentInfo>,
  lineId: string
): boolean {
  const display = deriveLineDeliveryDisplay(getLineShipmentInfo(lineShipmentMap, lineId));
  return display.message === '미등록';
}

/** 한국도착(예상) — 메신저 복사용 출고예정일 */
export function resolveOutboundScheduledDate(row: ShopOrderLineListRow): string | null {
  const expected = row.koreaArrivalDate?.trim().slice(0, 10);
  if (expected) return expected;
  return null;
}

/** 실제 입고일 우선, 없으면 한국도착(예상) */
export function resolveShopOrderInboundDate(row: ShopOrderLineListRow): string | null {
  const actual = row.actualArrivalDate?.trim().slice(0, 10);
  if (actual) return actual;
  const expected = row.koreaArrivalDate?.trim().slice(0, 10);
  if (expected) return expected;
  return null;
}

function compareBuyerModalLines(a: BuyerModalOrderLine, b: BuyerModalOrderLine): number {
  const dateA = a.inboundDate ?? '9999-12-31';
  const dateB = b.inboundDate ?? '9999-12-31';
  if (dateA !== dateB) return dateA.localeCompare(dateB);
  return a.orderRef.localeCompare(b.orderRef, 'ko');
}

function mapRowToBuyerModalLine(row: ShopOrderLineListRow): BuyerModalOrderLine {
  return {
    rowKey: row.rowKey,
    shopOrderId: row.shopOrderId,
    lineId: row.line.id,
    orderRef: formatLineOrderRef(row.line.lineOrderNumber, row.orderNumber, row.lineIndex),
    productName: row.productName,
    quantityLabel: formatLineQuantity(row.line),
    inboundDate: resolveShopOrderInboundDate(row),
    outboundScheduledDate: resolveOutboundScheduledDate(row),
    progressStatus: deriveLineProgressStatus(row.line),
    tab: 'pending_shipment',
  };
}

export function buildBuyerModalOrderLineGroups(
  orders: ShopOrder[],
  lineShipmentMap: Map<string, LineShipmentInfo>,
  companyName: string
): BuyerModalOrderLineGroups {
  const normalizedCompany = normalizeShopBuyerCompanyName(companyName);
  if (!normalizedCompany) {
    return { pendingShipment: [], inProgress: [], completed: [] };
  }

  const allRows = buildShopOrderLineListRows(orders, 'all').filter(
    (row) => normalizeShopBuyerCompanyName(row.line.companyName) === normalizedCompany
  );

  const pendingShipment: BuyerModalOrderLine[] = [];
  const inProgress: BuyerModalOrderLine[] = [];
  const completed: BuyerModalOrderLine[] = [];

  for (const row of allRows) {
    const mapped = mapRowToBuyerModalLine(row);
    const progressStatus = mapped.progressStatus;
    const isPendingShipment = isLineDeliveryUnregistered(lineShipmentMap, row.line.id);

    if (isPendingShipment && progressStatus !== '완료') {
      pendingShipment.push({ ...mapped, tab: 'pending_shipment' });
    }
    if (progressStatus === '배송중' || progressStatus === '정산중') {
      inProgress.push({ ...mapped, tab: 'in_progress' });
    }
    if (progressStatus === '완료') {
      completed.push({ ...mapped, tab: 'completed' });
    }
  }

  pendingShipment.sort(compareBuyerModalLines);
  inProgress.sort(compareBuyerModalLines);
  completed.sort(compareBuyerModalLines);

  return { pendingShipment, inProgress, completed };
}

/** 상품명 / 수량 / 출고예정일 — 주문 건마다 줄바꿈 */
export function formatBuyerModalLinesForCopy(lines: BuyerModalOrderLine[]): string {
  return lines
    .map((line) => {
      const scheduledDate = line.outboundScheduledDate ?? '-';
      return `${line.productName} / ${line.quantityLabel} / ${scheduledDate}`;
    })
    .join('\n');
}
