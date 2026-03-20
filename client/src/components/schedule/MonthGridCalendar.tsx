import { cn } from "../ui/utils";
import { getMonthGridCells, isSameDay, toDateKey } from "./dateUtils";
import { ScheduleDayKindCounts } from "./ScheduleDayKindCounts";
import { countEventsByKind, filterEvents, eventsForDateKey } from "./eventUtils";
import type { ScheduleEvent, ScheduleFiltersState } from "./types";
import { useLanguage } from "../../contexts/LanguageContext";

type Props = {
  month: Date;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  events: ScheduleEvent[];
  filters: ScheduleFiltersState;
};

const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];
const WEEKDAYS_ZH = ["日", "一", "二", "三", "四", "五", "六"];

export function MonthGridCalendar({ month, selectedDate, onSelectDate, events, filters }: Props) {
  const { language } = useLanguage();
  const weekdays = language === "zh" ? WEEKDAYS_ZH : WEEKDAYS_KO;
  const cells = getMonthGridCells(month);
  const visible = filterEvents(events, filters);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm md:p-2">
      <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] text-gray-500 md:text-xs">
        {weekdays.map((w) => (
          <div key={w} className="py-1 font-medium">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map(({ date, inMonth }) => {
          const key = toDateKey(date);
          const dayEvents = eventsForDateKey(visible, key);
          const kindCounts = countEventsByKind(dayEvents);
          const isSel = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, new Date());

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(date)}
              className={cn(
                "flex min-h-[72px] flex-col items-center rounded-lg border px-0.5 py-1 text-[13px] transition-colors md:min-h-[88px] md:px-1",
                !inMonth && "text-gray-300",
                inMonth && "text-gray-900",
                isToday && "border-purple-300 bg-purple-50/50",
                !isToday && "border-transparent hover:bg-gray-50",
                isSel && "ring-2 ring-purple-500 ring-offset-1",
              )}
            >
              <span className={cn("font-medium", !inMonth && "opacity-40")}>{date.getDate()}</span>
              <ScheduleDayKindCounts counts={kindCounts} className="mt-0.5 max-w-[5.75rem]" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
