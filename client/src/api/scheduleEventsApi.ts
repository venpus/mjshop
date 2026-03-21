import { getApiBaseUrl } from "./baseUrl";
import { getAdminUser } from "../utils/authStorage";
import { normalizeScheduleEventKind } from "../components/schedule/eventUtils";
import type { ScheduleEvent, ScheduleEventKind } from "../components/schedule/types";

const API_BASE = getApiBaseUrl();

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const user = getAdminUser();
  if (user?.id) headers["X-User-Id"] = user.id;
  return headers;
}

function jsonHeaders(): Record<string, string> {
  return { ...authHeaders(), "Content-Type": "application/json" };
}

/** 달력 그리드(6주)와 겹치는 일정 조회 */
export async function fetchScheduleEvents(fromKey: string, toKey: string): Promise<ScheduleEvent[]> {
  const search = new URLSearchParams();
  search.set("from", fromKey);
  search.set("to", toKey);
  const res = await fetch(`${API_BASE}/schedule-events?${search.toString()}`, {
    credentials: "include",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "일정을 불러올 수 없습니다.");
  }
  const body = await res.json();
  const data = body.data ?? [];
  return data.map(mapApiToEvent);
}

export async function fetchScheduleEventById(id: string): Promise<ScheduleEvent | null> {
  const res = await fetch(`${API_BASE}/schedule-events/${encodeURIComponent(id)}`, {
    credentials: "include",
    headers: authHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "일정을 불러올 수 없습니다.");
  }
  const body = await res.json();
  return mapApiToEvent(body.data);
}

/** API/직렬화에 따라 ISO 날짜 문자열이 올 수 있어 달력 비교용 YYYY-MM-DD로 통일 */
function normalizeApiDateKey(raw: unknown): string {
  if (raw == null) return "";
  const s = String(raw).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s;
}

function mapApiToEvent(row: Record<string, unknown>): ScheduleEvent {
  const transitRaw = row.transitDays ?? row.transit_days;
  const transitDays =
    transitRaw != null && transitRaw !== "" && !Number.isNaN(Number(transitRaw))
      ? Number(transitRaw)
      : undefined;
  return {
    id: String(row.id),
    title: String(row.title),
    startDateKey: normalizeApiDateKey(row.startDateKey ?? row.start_date),
    endDateKey: normalizeApiDateKey(row.endDateKey ?? row.end_date),
    kind: normalizeScheduleEventKind(row.kind),
    note: row.note != null ? String(row.note) : undefined,
    purchaseOrderId:
      row.purchaseOrderId != null && row.purchaseOrderId !== ""
        ? String(row.purchaseOrderId)
        : row.purchase_order_id != null && row.purchase_order_id !== ""
          ? String(row.purchase_order_id)
          : undefined,
    poNumber:
      row.poNumber != null
        ? String(row.poNumber)
        : row.po_number != null
          ? String(row.po_number)
          : undefined,
    productName:
      row.productName != null
        ? String(row.productName)
        : row.product_name != null
          ? String(row.product_name)
          : undefined,
    pairId:
      row.pairId != null && row.pairId !== ""
        ? String(row.pairId)
        : row.pair_id != null && row.pair_id !== ""
          ? String(row.pair_id)
          : undefined,
    transitDays,
    pairedEventId:
      row.pairedEventId != null && row.pairedEventId !== ""
        ? String(row.pairedEventId)
        : row.paired_event_id != null && row.paired_event_id !== ""
          ? String(row.paired_event_id)
          : undefined,
  };
}

export type CreateScheduleEventResult = {
  event: ScheduleEvent;
  pairedDateKey?: string;
};

export async function createScheduleEvent(payload: {
  id?: string;
  title: string;
  startDateKey: string;
  endDateKey: string;
  kind: ScheduleEventKind;
  note?: string;
  purchaseOrderId?: string | null;
  transitDays?: number;
}): Promise<CreateScheduleEventResult> {
  const bodyJson: Record<string, unknown> = {
    id: payload.id,
    title: payload.title,
    startDateKey: payload.startDateKey,
    endDateKey: payload.endDateKey,
    kind: payload.kind,
    note: payload.note ?? "",
    purchaseOrderId: payload.purchaseOrderId ?? undefined,
  };
  if (payload.kind === "logistics_dispatch" && payload.transitDays !== undefined) {
    bodyJson.transitDays = payload.transitDays;
  }
  const res = await fetch(`${API_BASE}/schedule-events`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders(),
    body: JSON.stringify(bodyJson),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "일정을 저장할 수 없습니다.");
  }
  const body = await res.json();
  const pairedRaw = body.pairedDateKey ?? body.paired_date_key;
  const pairedDateKey =
    pairedRaw != null && String(pairedRaw).trim() !== ""
      ? normalizeApiDateKey(pairedRaw)
      : undefined;
  return {
    event: mapApiToEvent(body.data),
    pairedDateKey,
  };
}

export type UpdateScheduleEventResult = {
  event: ScheduleEvent;
  pairedDateKey?: string;
};

export async function updateScheduleEvent(
  id: string,
  payload: {
    title: string;
    startDateKey: string;
    endDateKey: string;
    kind: ScheduleEventKind;
    note?: string;
    purchaseOrderId?: string | null;
    transitDays?: number;
  },
): Promise<UpdateScheduleEventResult> {
  const bodyJson: Record<string, unknown> = {
    title: payload.title,
    startDateKey: payload.startDateKey,
    endDateKey: payload.endDateKey,
    kind: payload.kind,
    note: payload.note ?? "",
    purchaseOrderId: payload.purchaseOrderId ?? undefined,
  };
  if (payload.kind === "logistics_dispatch" && payload.transitDays !== undefined) {
    bodyJson.transitDays = payload.transitDays;
  }
  const res = await fetch(`${API_BASE}/schedule-events/${encodeURIComponent(id)}`, {
    method: "PUT",
    credentials: "include",
    headers: jsonHeaders(),
    body: JSON.stringify(bodyJson),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "일정을 수정할 수 없습니다.");
  }
  const body = await res.json();
  const pairedRaw = body.pairedDateKey ?? body.paired_date_key;
  const pairedDateKey =
    pairedRaw != null && String(pairedRaw).trim() !== ""
      ? normalizeApiDateKey(pairedRaw)
      : undefined;
  return {
    event: mapApiToEvent(body.data),
    pairedDateKey,
  };
}

export async function deleteScheduleEvent(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/schedule-events/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "일정을 삭제할 수 없습니다.");
  }
}
