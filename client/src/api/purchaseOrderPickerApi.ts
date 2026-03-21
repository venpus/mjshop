import { getApiBaseUrl } from "./baseUrl";

export type PurchaseOrderPickerRow = {
  id: string;
  po_number: string;
  product_name: string;
};

/** 일정 피커: 한 번에 넉넉히 조회 (생산중·출고예정 동일 상한) */
const SCHEDULE_PICKER_ROW_LIMIT = 5000;

async function requestPurchaseOrders(
  path: string,
  params: URLSearchParams,
): Promise<PurchaseOrderPickerRow[]> {
  const reqUrl = `${path}?${params.toString()}`;
  console.debug("[SchedulePicker] request purchase orders:", reqUrl);
  const res = await fetch(`${path}?${params.toString()}`, {
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[SchedulePicker] purchase order request failed:", {
      url: reqUrl,
      status: res.status,
      error: err?.error,
    });
    throw new Error(err.error || "발주 목록을 불러올 수 없습니다.");
  }
  const body = await res.json();
  if (!body.success) {
    console.error("[SchedulePicker] purchase order response not successful:", {
      url: reqUrl,
      body,
    });
    throw new Error(body.error || "발주 목록을 불러올 수 없습니다.");
  }
  const rows = body.data ?? [];
  console.debug("[SchedulePicker] purchase order rows:", {
    url: reqUrl,
    count: rows.length,
  });
  return rows.map((po: Record<string, unknown>) => ({
    id: String(po.id),
    po_number: String(po.po_number ?? ""),
    product_name: String(po.product_name ?? ""),
  }));
}

/**
 * 생산중: 발주 컨펌·미입고 수량 0 초과 (일정 피커 전용)
 * 출고예정: 미입고 수량 0 초과 발주만 (일정 피커 전용)
 * 물류발송: 패킹리스트에 한 번이라도 등록된 발주만
 */
export async function searchPurchaseOrdersForSchedulePicker(
  mode: "production" | "shipment" | "logistics",
  search: string,
  limit = 30,
): Promise<PurchaseOrderPickerRow[]> {
  const base = getApiBaseUrl();
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  params.set("page", "1");
  const effectiveLimit = SCHEDULE_PICKER_ROW_LIMIT;
  params.set("limit", String(effectiveLimit));
  if (mode === "production") {
    params.set("schedule_production_picker", "1");
    return requestPurchaseOrders(`${base}/purchase-orders`, params);
  }

  if (mode === "logistics") {
    return requestPurchaseOrders(`${base}/purchase-orders/on-packing-lists`, params);
  }

  // 출고예정 일정 피커: 미입고 수량 0 초과 조건은 서버 플래그로 강제
  params.set("schedule_shipment_picker", "1");
  return requestPurchaseOrders(`${base}/purchase-orders/unshipped`, params);
}
