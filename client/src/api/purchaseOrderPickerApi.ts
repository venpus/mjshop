import { getApiBaseUrl } from "./baseUrl";

export type PurchaseOrderPickerRow = {
  id: string;
  po_number: string;
  product_name: string;
};

/** 일정 피커: 한 번에 넉넉히 조회 (생산중·출고예정 동일 상한) */
const SCHEDULE_PICKER_ROW_LIMIT = 5000;

/**
 * 생산중: 발주 컨펌·미입고 수량 0 초과 (일정 피커 전용)
 * 출고예정: 미출고 수량 있는 발주만 (발주관리 미출고 목록과 동일 기준)
 */
export async function searchPurchaseOrdersForSchedulePicker(
  mode: "production" | "shipment",
  search: string,
  limit = 30,
): Promise<PurchaseOrderPickerRow[]> {
  const base = getApiBaseUrl();
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  params.set("page", "1");
  params.set("limit", String(SCHEDULE_PICKER_ROW_LIMIT));
  if (mode === "production") {
    params.set("schedule_production_picker", "1");
  } else {
    params.set("schedule_shipment_picker", "1");
  }

  const path = mode === "shipment" ? `${base}/purchase-orders/unshipped` : `${base}/purchase-orders`;
  const res = await fetch(`${path}?${params.toString()}`, {
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "발주 목록을 불러올 수 없습니다.");
  }
  const body = await res.json();
  if (!body.success) {
    throw new Error(body.error || "발주 목록을 불러올 수 없습니다.");
  }
  const rows = body.data ?? [];
  return rows.map((po: Record<string, unknown>) => ({
    id: String(po.id),
    po_number: String(po.po_number ?? ""),
    product_name: String(po.product_name ?? ""),
  }));
}
