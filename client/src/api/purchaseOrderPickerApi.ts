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
  const effectiveLimit = mode === "production" ? SCHEDULE_PICKER_ROW_LIMIT : SCHEDULE_PICKER_ROW_LIMIT;
  params.set("limit", String(effectiveLimit));
  if (mode === "production") {
    params.set("schedule_production_picker", "1");
    return requestPurchaseOrders(`${base}/purchase-orders`, params);
  }

  // 구버전 서버 호환: schedule_shipment_picker 처리 오류가 나면 플래그 없이 재시도
  params.set("schedule_shipment_picker", "1");
  try {
    const rows = await requestPurchaseOrders(`${base}/purchase-orders/unshipped`, params);
    if (rows.length > 0) return rows;
    // 일부 서버는 플래그를 받지만 과하게 필터링해 빈 목록을 줄 수 있어, 빈 결과도 재시도
    console.warn("[SchedulePicker] empty rows with schedule_shipment_picker=1, retrying without flag", {
      search: search.trim(),
    });
    params.delete("schedule_shipment_picker");
    return await requestPurchaseOrders(`${base}/purchase-orders/unshipped`, params);
  } catch (firstError) {
    console.warn("[SchedulePicker] shipment picker request failed, retrying without flag", {
      error: firstError instanceof Error ? firstError.message : String(firstError),
      search: search.trim(),
    });
    params.delete("schedule_shipment_picker");
    try {
      return await requestPurchaseOrders(`${base}/purchase-orders/unshipped`, params);
    } catch {
      console.error("[SchedulePicker] shipment picker fallback also failed", {
        search: search.trim(),
      });
      throw firstError;
    }
  }
}
