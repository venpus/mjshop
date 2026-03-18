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

/** 지급 확정 모달용 행 (이름 + 금액) */
export interface AdminCostConfirmedRow {
  id: string;
  name: string;
  amount: number;
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
      });
    });

  const byName = (a: AdminCostConfirmedRow, b: AdminCostConfirmedRow) =>
    a.name.localeCompare(b.name, 'ko');
  purchaseOrders.sort(byName);
  packingLists.sort(byName);

  return { purchaseOrders, packingLists };
}
