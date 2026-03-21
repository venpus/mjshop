import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";
import { addDays, isSameDay, startOfWeekSunday, toDateKey } from "./dateUtils";
import { ScheduleDayKindCounts } from "./ScheduleDayKindCounts";
import { countEventsByKind, filterEvents, eventsForDateKey } from "./eventUtils";
import { holidaysCoveringDateKey } from "./holidayUtils";
import type { ScheduleEvent, ScheduleFiltersState } from "./types";
import type { CalendarHoliday } from "../../api/calendarHolidaysApi";
import { useLanguage } from "../../contexts/LanguageContext";

type Props = {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  events: ScheduleEvent[];
  filters: ScheduleFiltersState;
  holidays: readonly CalendarHoliday[];
  onCellContextMenu?: (date: Date, clientX: number, clientY: number) => void;
  className?: string;
};

export function WeekStrip({
  selectedDate,
  onSelectDate,
  events,
  filters,
  holidays,
  onCellContextMenu,
  className,
}: Props) {
  const { language } = useLanguage();
  const locale = language === "zh" ? "zh-CN" : "ko-KR";
  const start = startOfWeekSunday(selectedDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const visible = filterEvents(events, filters);

  const shiftWeek = (delta: number) => {
    onSelectDate(addDays(selectedDate, delta * 7));
  };

  return (
    <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col gap-2", className)}>
      <div className="flex shrink-0 items-center justify-between gap-2">
        <Button type="button" variant="outline" size="icon" className="size-9 shrink-0" onClick={() => shiftWeek(-1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-xs text-gray-500">
          {start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          {" — "}
          {addDays(start, 6).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </span>
        <Button type="button" variant="outline" size="icon" className="size-9 shrink-0" onClick={() => shiftWeek(1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-7 gap-1 auto-rows-[minmax(5.5rem,1fr)]">
        {days.map((d) => {
          const key = toDateKey(d);
          const list = eventsForDateKey(visible, key);
          const kindCounts = countEventsByKind(list);
          const sel = isSameDay(d, selectedDate);
          const today = isSameDay(d, new Date());
          const dayHolidays = holidaysCoveringDateKey(holidays, key);
          const isHoliday = dayHolidays.length > 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(d)}
              onContextMenu={(e) => {
                if (!onCellContextMenu) return;
                e.preventDefault();
                onCellContextMenu(d, e.clientX, e.clientY);
              }}
              className={cn(
                "flex h-full min-h-0 min-w-0 flex-col items-stretch overflow-hidden rounded-lg border px-0.5 pb-2 pt-0 text-center",
                today && "border-purple-300 bg-purple-50/50",
                !today && "border-gray-100",
                sel && "ring-2 ring-purple-500",
              )}
            >
              <div className="flex w-full shrink-0 items-start justify-between gap-0.5 px-0.5 pt-1">
                <span className="shrink-0 text-[10px] font-medium text-gray-500">
                  {d.toLocaleDateString(locale, { weekday: "short" })}
                </span>
                <span
                  className={cn(
                    "shrink-0 text-sm font-bold tabular-nums leading-none",
                    isHoliday ? "text-red-600" : "text-gray-900",
                  )}
                >
                  {d.getDate()}
                </span>
              </div>
              {dayHolidays.length > 0 && (
                <div className="mt-0.5 w-full shrink-0 space-y-0.5 px-0.5 text-right">
                  {dayHolidays.map((h) => (
                    <div
                      key={h.id}
                      className="truncate text-[7px] font-semibold leading-tight text-red-700 md:text-[8px]"
                      title={h.title || undefined}
                    >
                      {h.title?.trim() ? h.title : "—"}
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-auto min-h-0 w-full flex-1 overflow-y-auto">
                <ScheduleDayKindCounts counts={kindCounts} className="mt-1 max-w-full text-[7px] md:text-[8px]" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
