import { cn } from "../ui/utils";
import { getMonthGridCells, isSameDay, toDateKey } from "./dateUtils";
import { ScheduleDayKindCounts } from "./ScheduleDayKindCounts";
import { countEventsByKind, filterEvents, eventsForDateKey } from "./eventUtils";
import { holidaysCoveringDateKey } from "./holidayUtils";
import type { ScheduleEvent, ScheduleFiltersState } from "./types";
import type { CalendarHoliday } from "../../api/calendarHolidaysApi";
import { useLanguage } from "../../contexts/LanguageContext";

type Props = {
  month: Date;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  events: ScheduleEvent[];
  filters: ScheduleFiltersState;
  holidays: readonly CalendarHoliday[];
  onCellContextMenu?: (date: Date, clientX: number, clientY: number) => void;
  className?: string;
};

const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];
const WEEKDAYS_ZH = ["日", "一", "二", "三", "四", "五", "六"];

export function MonthGridCalendar({
  month,
  selectedDate,
  onSelectDate,
  events,
  filters,
  holidays,
  onCellContextMenu,
  className,
}: Props) {
  const { language } = useLanguage();
  const weekdays = language === "zh" ? WEEKDAYS_ZH : WEEKDAYS_KO;
  const cells = getMonthGridCells(month);
  const visible = filterEvents(events, filters);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-col rounded-xl border border-gray-200 bg-white p-2 shadow-sm md:p-2",
        className,
      )}
    >
      <div className="grid shrink-0 grid-cols-7 gap-0 border border-gray-200 text-center text-[11px] text-gray-500 md:text-xs">
        {weekdays.map((w) => (
          <div key={w} className="py-1.5 font-medium md:py-2">
            {w}
          </div>
        ))}
      </div>
      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-7 grid-rows-[repeat(6,minmax(4rem,1fr))] gap-0 border-x border-b border-gray-200 md:grid-rows-[repeat(6,minmax(4.5rem,1fr))]">
        {cells.map(({ date, inMonth }) => {
          const key = toDateKey(date);
          const dayEvents = eventsForDateKey(visible, key);
          const kindCounts = countEventsByKind(dayEvents);
          const isSel = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, new Date());
          const dayHolidays = holidaysCoveringDateKey(holidays, key);
          const isHoliday = dayHolidays.length > 0;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(date)}
              onContextMenu={(e) => {
                if (!onCellContextMenu) return;
                e.preventDefault();
                onCellContextMenu(date, e.clientX, e.clientY);
              }}
              className={cn(
                "flex h-full min-h-0 w-full min-w-0 flex-col items-stretch overflow-hidden border border-gray-200 px-0.5 pb-1 pt-0 text-[13px] transition-colors md:px-1",
                !inMonth && "text-gray-300",
                inMonth && "text-gray-900",
                isToday && "border-purple-300 bg-purple-50/50",
                !isToday && "hover:bg-gray-50",
                isSel && "ring-2 ring-purple-500 ring-offset-1",
              )}
            >
              <div className="flex w-full shrink-0 justify-end pr-0.5 pt-0.5">
                <span
                  className={cn(
                    "tabular-nums font-bold leading-none",
                    !inMonth && "opacity-40",
                    isHoliday ? "text-red-600" : inMonth && "text-gray-900",
                  )}
                >
                  {date.getDate()}
                </span>
              </div>
              {dayHolidays.length > 0 && (
                <div className="mt-0.5 w-full max-w-[5.75rem] shrink-0 space-y-0.5 px-0.5 text-right">
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
              <div className="mt-auto min-h-0 w-full max-w-[5.75rem] flex-1 overflow-y-auto">
                <ScheduleDayKindCounts counts={kindCounts} className="mt-0.5" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
