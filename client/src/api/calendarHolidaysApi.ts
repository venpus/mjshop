import { getApiBaseUrl } from "./baseUrl";
import { getAdminUser } from "../utils/authStorage";

const API_BASE = getApiBaseUrl();

export type CalendarHoliday = {
  id: string;
  startDate: string;
  endDate: string;
  title: string;
};

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const user = getAdminUser();
  if (user?.id) headers["X-User-Id"] = user.id;
  return headers;
}

function jsonHeaders(): Record<string, string> {
  return { ...authHeaders(), "Content-Type": "application/json" };
}

function normalizeDateKey(v: unknown): string {
  if (v == null) return "";
  const s = String(v).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s;
}

function mapRow(row: Record<string, unknown>): CalendarHoliday {
  const start =
    normalizeDateKey(row.startDate ?? row.start_date) ||
    normalizeDateKey(row.holidayDate ?? row.holiday_date);
  const end =
    normalizeDateKey(row.endDate ?? row.end_date) || start;
  return {
    id: String(row.id),
    startDate: start,
    endDate: end,
    title: row.title != null ? String(row.title) : "",
  };
}

export async function fetchCalendarHolidays(fromKey: string, toKey: string): Promise<CalendarHoliday[]> {
  const search = new URLSearchParams();
  search.set("from", fromKey);
  search.set("to", toKey);
  const res = await fetch(`${API_BASE}/calendar-holidays?${search.toString()}`, {
    credentials: "include",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "공휴일을 불러올 수 없습니다.");
  }
  const body = await res.json();
  const data = body.data ?? [];
  return data.map(mapRow);
}

export async function createCalendarHoliday(payload: {
  startDate: string;
  endDate: string;
  title: string;
}): Promise<CalendarHoliday> {
  const res = await fetch(`${API_BASE}/calendar-holidays`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders(),
    body: JSON.stringify({
      startDate: payload.startDate,
      endDate: payload.endDate,
      title: payload.title,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "공휴일을 저장할 수 없습니다.");
  }
  const body = await res.json();
  return mapRow(body.data);
}

export async function updateCalendarHoliday(
  id: string,
  payload: { startDate: string; endDate: string; title: string },
): Promise<CalendarHoliday> {
  const res = await fetch(`${API_BASE}/calendar-holidays/${encodeURIComponent(id)}`, {
    method: "PUT",
    credentials: "include",
    headers: jsonHeaders(),
    body: JSON.stringify({
      startDate: payload.startDate,
      endDate: payload.endDate,
      title: payload.title,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "공휴일을 수정할 수 없습니다.");
  }
  const body = await res.json();
  return mapRow(body.data);
}

export async function deleteCalendarHoliday(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/calendar-holidays/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "공휴일을 삭제할 수 없습니다.");
  }
}
