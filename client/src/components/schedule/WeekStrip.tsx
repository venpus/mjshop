import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";
import { addDays, isSameDay, startOfWeekSunday, toDateKey } from "./dateUtils";
import { ScheduleDayKindCounts } from "./ScheduleDayKindCounts";
import { countEventsByKind, filterEvents, eventsForDateKey } from "./eventUtils";
import type { ScheduleEvent, ScheduleFiltersState } from "./types";
import { useLanguage } from "../../contexts/LanguageContext";

type Props = {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  events: ScheduleEvent[];
  filters: ScheduleFiltersState;
};

export function WeekStrip({ selectedDate, onSelectDate, events, filters }: Props) {
  const { language } = useLanguage();
  const locale = language === "zh" ? "zh-CN" : "ko-KR";
  const start = startOfWeekSunday(selectedDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const visible = filterEvents(events, filters);

  const shiftWeek = (delta: number) => {
    onSelectDate(addDays(selectedDate, delta * 7));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
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
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const key = toDateKey(d);
          const list = eventsForDateKey(visible, key);
          const kindCounts = countEventsByKind(list);
          const sel = isSameDay(d, selectedDate);
          const today = isSameDay(d, new Date());
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(d)}
              className={cn(
                "flex flex-col items-center rounded-lg border px-0.5 py-2 text-center",
                today && "border-purple-300 bg-purple-50/50",
                !today && "border-gray-100",
                sel && "ring-2 ring-purple-500",
              )}
            >
              <span className="text-[10px] text-gray-500">
                {d.toLocaleDateString(locale, { weekday: "short" })}
              </span>
              <span className="text-sm font-semibold">{d.getDate()}</span>
              <ScheduleDayKindCounts counts={kindCounts} className="mt-1 max-w-full text-[7px] md:text-[8px]" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
