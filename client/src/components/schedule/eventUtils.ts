import type { ScheduleEvent, ScheduleEventKind, ScheduleFiltersState } from "./types";

/** API/DB 직렬화 이슈로 kind가 어긋치지 않게 통일 (필터·집계에서 누락 방지) */
export function normalizeScheduleEventKind(raw: unknown): ScheduleEventKind {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (s === "production" || s === "shipment" || s === "other") return s;
  return "other";
}

/** 해당 날짜에 걸친 일정(이미 필터 적용된 목록)의 유형별 건수 */
export function countEventsByKind(events: ScheduleEvent[]): Record<ScheduleEventKind, number> {
  const n: Record<ScheduleEventKind, number> = { production: 0, shipment: 0, other: 0 };
  for (const e of events) {
    n[normalizeScheduleEventKind(e.kind)] += 1;
  }
  return n;
}

export function filterEvents(
  events: ScheduleEvent[],
  filters: ScheduleFiltersState,
): ScheduleEvent[] {
  return events.filter((e) => filters[normalizeScheduleEventKind(e.kind)]);
}

/** 해당 날짜가 일정 기간(시작~종료, 포함)에 포함되는지 */
export function eventsForDateKey(
  events: ScheduleEvent[],
  dateKey: string,
): ScheduleEvent[] {
  return events.filter((e) => e.startDateKey <= dateKey && e.endDateKey >= dateKey);
}

export function kindColors(kind: ScheduleEventKind): { dot: string; text: string; bgSoft: string } {
  switch (kind) {
    case "production":
      return {
        dot: "bg-violet-500",
        text: "text-violet-700",
        bgSoft: "bg-violet-50",
      };
    case "shipment":
      return {
        dot: "bg-sky-500",
        text: "text-sky-700",
        bgSoft: "bg-sky-50",
      };
    default:
      return {
        dot: "bg-amber-500",
        text: "text-amber-800",
        bgSoft: "bg-amber-50",
      };
  }
}
