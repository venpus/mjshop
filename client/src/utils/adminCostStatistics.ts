import type { PaymentHistoryItem } from '../api/paymentHistoryApi';

export interface AdminCostDetail {
  backMargin: number;
  adminCostItems: number;
  shippingDifference: number;
}

export function emptyAdminCostDetail(): AdminCostDetail {
  return { backMargin: 0, adminCostItems: 0, shippingDifference: 0 };
}

function addDetail(target: AdminCostDetail, partial: Partial<AdminCostDetail>): void {
  if (partial.backMargin != null) target.backMargin += partial.backMargin;
  if (partial.adminCostItems != null) target.adminCostItems += partial.adminCostItems;
  if (partial.shippingDifference != null) target.shippingDifference += partial.shippingDifference;
}

/** 발주 1건의 A레벨 관리자 비용(주가비+관리자입력) 및 상세 */
export function getPurchaseOrderAdminCostParts(item: PaymentHistoryItem): {
  total: number;
  backMargin: number;
  adminCostItems: number;
} {
  let total = 0;
  if (item.admin_total_cost !== undefined && item.admin_total_cost !== null) {
    total = item.admin_total_cost;
  } else {
    const backMargin = item.back_margin || 0;
    const quantity = item.quantity || 0;
    const adminCostItemsTotal = item.admin_cost_items
      ? item.admin_cost_items
          .filter((c) => c.is_admin_only === true)
          .reduce((s, c) => s + (c.cost || 0), 0)
      : 0;
    total = backMargin * quantity + adminCostItemsTotal;
  }
  const backMargin = (item.back_margin || 0) * (item.quantity || 0);
  const adminCostItems = item.admin_cost_items
    ? item.admin_cost_items.filter((c) => c.is_admin_only === true).reduce((s, c) => s + (c.cost || 0), 0)
    : 0;
  return { total, backMargin, adminCostItems };
}

/** 발주: 잔금 지급 완료(잔금 지급일 또는 잔금 지급완료 상태) */
export function isPurchaseOrderBalanceSettled(item: PaymentHistoryItem): boolean {
  return !!(item.balance_payment_date || item.balance_status === 'paid');
}

/** 패킹: 배송비 지급일(지급 날짜) 지정됨 */
export function isPackingListPaymentDateSet(item: PaymentHistoryItem): boolean {
  const d = item.wk_payment_date;
  return !!(d && String(d).trim());
}

export interface AdminCostBucketTotals {
  totalSum: number;
  totalDetail: AdminCostDetail;
  pendingSum: number;
  pendingDetail: AdminCostDetail;
  confirmedSum: number;
  confirmedDetail: AdminCostDetail;
  paidSum: number;
  paidDetail: AdminCostDetail;
}

/**
 * A레벨 관리자 비용을 지급완료 / 지급확정 / 지급예정으로 분류
 * - 지급완료: admin_cost_paid
 * - 지급확정: 미완료이면서 (발주 잔금완료 | 패킹 지급일 지정)
 * - 지급예정: 그 외 미완료
 */
export function aggregateAdminCostByPaymentBucket(
  allHistory: PaymentHistoryItem[],
  isOnOrAfterAdminCostFromDate: (dateStr: string | null | undefined) => boolean
): AdminCostBucketTotals {
  const totalDetail = emptyAdminCostDetail();
  const pendingDetail = emptyAdminCostDetail();
  const confirmedDetail = emptyAdminCostDetail();
  const paidDetail = emptyAdminCostDetail();
  let totalSum = 0;
  let pendingSum = 0;
  let confirmedSum = 0;
  let paidSum = 0;

  allHistory
    .filter((item) => item.source_type === 'purchase_order' && isOnOrAfterAdminCostFromDate(item.order_date))
    .forEach((item) => {
      const { total, backMargin, adminCostItems } = getPurchaseOrderAdminCostParts(item);

      totalSum += total;
      addDetail(totalDetail, { backMargin, adminCostItems });

      if (item.admin_cost_paid === true) {
        paidSum += total;
        addDetail(paidDetail, { backMargin, adminCostItems });
      } else if (isPurchaseOrderBalanceSettled(item)) {
        confirmedSum += total;
        addDetail(confirmedDetail, { backMargin, adminCostItems });
      } else {
        pendingSum += total;
        addDetail(pendingDetail, { backMargin, adminCostItems });
      }
    });

  allHistory
    .filter((item) =>
      item.source_type === 'packing_list' && isOnOrAfterAdminCostFromDate(item.shipment_date || item.pl_created_at)
    )
    .forEach((item) => {
      const diff = item.shipping_cost_difference || 0;
      if (!diff) return;

      totalSum += diff;
      addDetail(totalDetail, { shippingDifference: diff });

      if (item.admin_cost_paid) {
        paidSum += diff;
        addDetail(paidDetail, { shippingDifference: diff });
      } else if (isPackingListPaymentDateSet(item)) {
        confirmedSum += diff;
        addDetail(confirmedDetail, { shippingDifference: diff });
      } else {
        pendingSum += diff;
        addDetail(pendingDetail, { shippingDifference: diff });
      }
    });

  return {
    totalSum,
    totalDetail,
    pendingSum,
    pendingDetail,
    confirmedSum,
    confirmedDetail,
    paidSum,
    paidDetail,
  };
}

/** 지급 확정 모달용 행 (이름 + 금액 + 날짜 그룹 키) */
export interface AdminCostConfirmedRow {
  id: string;
  name: string;
  amount: number;
  /** YYYY-MM-DD. 확정: 발주 잔금일·패킹 wk_payment_date / 완료: admin_cost_paid_date. 없으면 날짜 미지정 */
  groupDateKey: string | null;
}

/** 모달 날짜별 접기용 그룹 */
export interface AdminCostConfirmedDateGroup {
  dateKey: string | null;
  rows: AdminCostConfirmedRow[];
  subtotal: number;
}

function normalizeDateKey(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  return s.slice(0, 10);
}

/** 발주·패킹 행을 한 목록으로 합칠 때 React key 충돌 방지 */
export function mergeAdminCostLedgerRowsForModal(
  purchaseOrders: AdminCostConfirmedRow[],
  packingLists: AdminCostConfirmedRow[]
): AdminCostConfirmedRow[] {
  const po = purchaseOrders.map((r) => ({ ...r, id: `ledger-po:${r.id}` }));
  const pl = packingLists.map((r) => ({ ...r, id: `ledger-pl:${r.id}` }));
  return [...po, ...pl];
}

/**
 * 지급 확정 행을 날짜별로 묶음. 날짜는 내림차순, 날짜 미지정은 맨 아래. 그룹 내 이름 순.
 */
export function groupAdminCostConfirmedRowsByDate(rows: AdminCostConfirmedRow[]): AdminCostConfirmedDateGroup[] {
  const bucket = new Map<string | null, AdminCostConfirmedRow[]>();
  for (const row of rows) {
    const key = row.groupDateKey ?? null;
    const list = bucket.get(key);
    if (list) list.push(row);
    else bucket.set(key, [row]);
  }
  const groups: AdminCostConfirmedDateGroup[] = [];
  for (const [dateKey, list] of bucket) {
    const sortedRows = [...list].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    groups.push({
      dateKey,
      rows: sortedRows,
      subtotal: sortedRows.reduce((s, r) => s + r.amount, 0),
    });
  }
  groups.sort((a, b) => {
    if (a.dateKey === null && b.dateKey === null) return 0;
    if (a.dateKey === null) return 1;
    if (b.dateKey === null) return -1;
    return b.dateKey.localeCompare(a.dateKey);
  });
  return groups;
}

function buildPurchaseOrderDisplayName(item: PaymentHistoryItem): string {
  const po = item.po_number?.trim();
  const product = item.product_name?.trim();
  if (po && product) return `[${po}] ${product}`;
  if (product) return product;
  if (po) return po;
  return item.source_id || '-';
}

function buildPackingListDisplayName(item: PaymentHistoryItem): string {
  const code = item.packing_code?.trim();
  const product = item.product_name?.trim();
  const logistics = item.logistics_company?.trim();
  const base =
    code && product ? `[${code}] ${product}` : product || code || item.source_id || '-';
  return logistics ? `${base} · ${logistics}` : base;
}

/**
 * 지급 확정 상태인 항목만 목록화 (금액 0 초과만)
 */
export function collectAdminCostConfirmedItems(
  allHistory: PaymentHistoryItem[],
  isOnOrAfterAdminCostFromDate: (dateStr: string | null | undefined) => boolean
): { purchaseOrders: AdminCostConfirmedRow[]; packingLists: AdminCostConfirmedRow[] } {
  const purchaseOrders: AdminCostConfirmedRow[] = [];
  const packingLists: AdminCostConfirmedRow[] = [];

  allHistory
    .filter((item) => item.source_type === 'purchase_order' && isOnOrAfterAdminCostFromDate(item.order_date))
    .forEach((item) => {
      if (item.admin_cost_paid === true) return;
      if (!isPurchaseOrderBalanceSettled(item)) return;
      const { total } = getPurchaseOrderAdminCostParts(item);
      if (total <= 0) return;
      purchaseOrders.push({
        id: item.id,
        name: buildPurchaseOrderDisplayName(item),
        amount: total,
        groupDateKey: normalizeDateKey(item.balance_payment_date),
      });
    });

  allHistory
    .filter((item) =>
      item.source_type === 'packing_list' && isOnOrAfterAdminCostFromDate(item.shipment_date || item.pl_created_at)
    )
    .forEach((item) => {
      if (item.admin_cost_paid) return;
      if (!isPackingListPaymentDateSet(item)) return;
      const diff = item.shipping_cost_difference || 0;
      if (diff <= 0) return;
      packingLists.push({
        id: item.id,
        name: buildPackingListDisplayName(item),
        amount: diff,
        groupDateKey: normalizeDateKey(item.wk_payment_date),
      });
    });

  return { purchaseOrders, packingLists };
}

/**
 * A레벨 관리자 비용 지급완료(admin_cost_paid) 항목만 목록화 (금액 0 초과만).
 * 날짜 그룹은 admin_cost_paid_date 기준.
 */
export function collectAdminCostPaidItems(
  allHistory: PaymentHistoryItem[],
  isOnOrAfterAdminCostFromDate: (dateStr: string | null | undefined) => boolean
): { purchaseOrders: AdminCostConfirmedRow[]; packingLists: AdminCostConfirmedRow[] } {
  const purchaseOrders: AdminCostConfirmedRow[] = [];
  const packingLists: AdminCostConfirmedRow[] = [];

  allHistory
    .filter((item) => item.source_type === 'purchase_order' && isOnOrAfterAdminCostFromDate(item.order_date))
    .forEach((item) => {
      if (item.admin_cost_paid !== true) return;
      const { total } = getPurchaseOrderAdminCostParts(item);
      if (total <= 0) return;
      purchaseOrders.push({
        id: item.id,
        name: buildPurchaseOrderDisplayName(item),
        amount: total,
        groupDateKey: normalizeDateKey(item.admin_cost_paid_date),
      });
    });

  allHistory
    .filter((item) =>
      item.source_type === 'packing_list' && isOnOrAfterAdminCostFromDate(item.shipment_date || item.pl_created_at)
    )
    .forEach((item) => {
      if (!item.admin_cost_paid) return;
      const diff = item.shipping_cost_difference || 0;
      if (diff <= 0) return;
      packingLists.push({
        id: item.id,
        name: buildPackingListDisplayName(item),
        amount: diff,
        groupDateKey: normalizeDateKey(item.admin_cost_paid_date),
      });
    });

  return { purchaseOrders, packingLists };
}
