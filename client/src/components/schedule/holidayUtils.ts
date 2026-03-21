import type { CalendarHoliday } from "../../api/calendarHolidaysApi";

/** 해당 날짜가 [startDate, endDate] 구간에 포함되는 공휴일 전부 (중복 기간 허용) */
export function holidaysCoveringDateKey(
  holidays: readonly CalendarHoliday[],
  dateKey: string,
): CalendarHoliday[] {
  return holidays.filter((h) => h.startDate <= dateKey && h.endDate >= dateKey);
}
