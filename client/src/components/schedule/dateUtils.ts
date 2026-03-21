/** 로컬 날짜 기준 YYYY-MM-DD */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

/** 일요일 시작 주의 해당 날짜가 속한 주의 일요일 */
export function startOfWeekSunday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  return x;
}

export function addDays(d: Date, delta: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + delta);
  return x;
}

/** 해당 월이 걸치는 주만 포함(4~6주, 28~42칸). 빈 6번째 줄 없음. */
export function getMonthGridCells(monthAnchor: Date): { date: Date; inMonth: boolean }[] {
  const first = startOfMonth(monthAnchor);
  const start = startOfWeekSunday(first);
  const lastDayOfMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0);
  const lastWeekSunday = startOfWeekSunday(lastDayOfMonth);
  const gridEnd = addDays(lastWeekSunday, 6);

  const cells: { date: Date; inMonth: boolean }[] = [];
  const m = monthAnchor.getMonth();
  let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const end = new Date(gridEnd.getFullYear(), gridEnd.getMonth(), gridEnd.getDate());
  while (cursor.getTime() <= end.getTime()) {
    cells.push({
      date: new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()),
      inMonth: cursor.getMonth() === m,
    });
    cursor = addDays(cursor, 1);
  }
  return cells;
}

/** 월 그리드(표시 칸)의 첫날·마지막날 키 — API 조회 범위에 사용 */
export function getCalendarViewportBounds(monthAnchor: Date): { fromKey: string; toKey: string } {
  const cells = getMonthGridCells(monthAnchor);
  const first = cells[0].date;
  const last = cells[cells.length - 1].date;
  return { fromKey: toDateKey(first), toKey: toDateKey(last) };
}

/** 저장한 일정 날짜가 뷰포트 밖이어도 목록에 포함되도록 조회 구간을 넓힘 (YYYY-MM-DD 문자열 비교) */
export function mergeViewportWithEventRange(
  viewport: { fromKey: string; toKey: string },
  eventStartKey: string,
  eventEndKey: string,
): { fromKey: string; toKey: string } {
  const lo = eventStartKey <= eventEndKey ? eventStartKey : eventEndKey;
  const hi = eventStartKey > eventEndKey ? eventStartKey : eventEndKey;
  return {
    fromKey: lo < viewport.fromKey ? lo : viewport.fromKey,
    toKey: hi > viewport.toKey ? hi : viewport.toKey,
  };
}

/** 서버 `scheduleDateKey`와 동일: YYYY-MM-DD에 달력일 N일 (UTC) */
export function addCalendarDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** YYYY-MM-DD 두 개를 짧게 표시 (같은 날이면 한 번만) */
export function formatScheduleDateRangeLabel(
  startKey: string,
  endKey: string,
  language: "ko" | "zh",
): string {
  const locale = language === "zh" ? "zh-CN" : "ko-KR";
  const opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  const s = parseDateKey(startKey).toLocaleDateString(locale, opts);
  if (startKey === endKey) return s;
  const e = parseDateKey(endKey).toLocaleDateString(locale, opts);
  return `${s} ~ ${e}`;
}
