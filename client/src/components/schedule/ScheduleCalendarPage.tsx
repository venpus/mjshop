import { useCallback, useEffect, useMemo, useState } from "react";
import { useForceMobileLayout } from "../../hooks/useForceMobileLayout";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  createScheduleEvent,
  deleteScheduleEvent,
  fetchScheduleEvents,
  updateScheduleEvent,
} from "../../api/scheduleEventsApi";
import {
  addMonths,
  getCalendarViewportBounds,
  mergeViewportWithEventRange,
  startOfMonth,
  toDateKey,
} from "./dateUtils";
import { filterEvents, eventsForDateKey } from "./eventUtils";
import { ScheduleMonthHeader } from "./ScheduleMonthHeader";
import { ScheduleFilters } from "./ScheduleFilters";
import { MonthGridCalendar } from "./MonthGridCalendar";
import { WeekStrip } from "./WeekStrip";
import { ScheduleDayContent } from "./ScheduleDayContent";
import { ScheduleAddEventDialog } from "./ScheduleAddEventDialog";
import type { ScheduleEvent, ScheduleEventKind, ScheduleFiltersState } from "./types";
import { DEFAULT_SCHEDULE_FILTERS } from "./types";

export function ScheduleCalendarPage() {
  const { t } = useLanguage();
  const isMobileLayout = useForceMobileLayout();

  const [cursorMonth, setCursorMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [filters, setFilters] = useState<ScheduleFiltersState>(DEFAULT_SCHEDULE_FILTERS);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadEvents = useCallback(
    async (includeRange?: { startDateKey: string; endDateKey: string }) => {
      setLoading(true);
      setLoadError(null);
      try {
        const viewport = getCalendarViewportBounds(cursorMonth);
        const { fromKey, toKey } = includeRange
          ? mergeViewportWithEventRange(viewport, includeRange.startDateKey, includeRange.endDateKey)
          : viewport;
        const data = await fetchScheduleEvents(fromKey, toKey);
        setEvents(data);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : t("common.error"));
        setEvents([]);
      } finally {
        setLoading(false);
      }
    },
    [cursorMonth, t],
  );

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const selectDate = (d: Date) => {
    setSelectedDate(d);
    setCursorMonth((prev) => {
      const next = startOfMonth(d);
      if (prev.getFullYear() === next.getFullYear() && prev.getMonth() === next.getMonth()) {
        return prev;
      }
      return next;
    });
  };

  const goToday = () => {
    const n = new Date();
    setSelectedDate(n);
    setCursorMonth(startOfMonth(n));
  };

  const prevMonth = () => {
    const m = addMonths(cursorMonth, -1);
    setCursorMonth(m);
    setSelectedDate(new Date(m.getFullYear(), m.getMonth(), 1));
  };

  const nextMonth = () => {
    const m = addMonths(cursorMonth, 1);
    setCursorMonth(m);
    setSelectedDate(new Date(m.getFullYear(), m.getMonth(), 1));
  };

  const filtered = useMemo(() => filterEvents(events, filters), [events, filters]);
  const selectedKey = toDateKey(selectedDate);
  const dayEvents = useMemo(
    () => eventsForDateKey(filtered, selectedKey).sort((a, b) => a.title.localeCompare(b.title)),
    [filtered, selectedKey],
  );

  const createEvent = async (payload: {
    title: string;
    kind: ScheduleEventKind;
    note: string;
    startDateKey: string;
    endDateKey: string;
    purchaseOrderId?: string | null;
  }) => {
    const id = `u-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    await createScheduleEvent({
      id,
      title: payload.title,
      kind: payload.kind,
      startDateKey: payload.startDateKey,
      endDateKey: payload.endDateKey,
      note: payload.note || undefined,
      purchaseOrderId: payload.purchaseOrderId ?? undefined,
    });
    await loadEvents();
  };

  const patchEvent = async (
    eventId: string,
    payload: {
      title: string;
      kind: ScheduleEventKind;
      note: string;
      startDateKey: string;
      endDateKey: string;
      purchaseOrderId?: string | null;
    },
  ) => {
    await updateScheduleEvent(eventId, {
      title: payload.title,
      kind: payload.kind,
      startDateKey: payload.startDateKey,
      endDateKey: payload.endDateKey,
      note: payload.note || undefined,
      purchaseOrderId: payload.purchaseOrderId ?? undefined,
    });
    await loadEvents({ startDateKey: payload.startDateKey, endDateKey: payload.endDateKey });
  };

  const openCreateDialog = () => {
    setEditingEvent(null);
    setEventDialogOpen(true);
  };

  const openEditDialog = (ev: ScheduleEvent) => {
    setEditingEvent(ev);
    setEventDialogOpen(true);
  };

  const handleEventDialogOpenChange = (next: boolean) => {
    setEventDialogOpen(next);
    if (!next) setEditingEvent(null);
  };

  const removeEvent = async (id: string) => {
    if (!window.confirm(t("schedule.deleteConfirm"))) return;
    try {
      await deleteScheduleEvent(id);
      await loadEvents();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : t("common.error"));
    }
  };

  return (
    <div className="flex min-h-full flex-col gap-4 p-4 lg:min-h-0 lg:flex-row lg:gap-6 lg:p-6">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t("schedule.pageTitle")}</h1>
          <p className="mt-1 text-sm text-gray-500">{t("schedule.pageSubtitle")}</p>
        </div>

        <ScheduleMonthHeader month={cursorMonth} onPrevMonth={prevMonth} onNextMonth={nextMonth} onToday={goToday} />

        <ScheduleFilters value={filters} onChange={setFilters} />

        {loadError && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <span className="flex-1">{loadError}</span>
            <button type="button" className="font-medium text-red-900 underline" onClick={() => void loadEvents()}>
              {t("schedule.retryLoad")}
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-500">{t("common.loading")}</p>
        ) : (
          <>
            {isMobileLayout ? (
              <WeekStrip
                selectedDate={selectedDate}
                onSelectDate={selectDate}
                events={events}
                filters={filters}
              />
            ) : (
              <MonthGridCalendar
                month={cursorMonth}
                selectedDate={selectedDate}
                onSelectDate={selectDate}
                events={events}
                filters={filters}
              />
            )}
          </>
        )}
      </div>

      <aside
        className={
          isMobileLayout
            ? "w-full shrink-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            : "hidden w-full max-w-[29.04rem] shrink-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:block"
        }
      >
        <ScheduleDayContent
          date={selectedDate}
          events={dayEvents}
          onAddClick={openCreateDialog}
          onEdit={openEditDialog}
          onRemove={removeEvent}
        />
      </aside>

      <ScheduleAddEventDialog
        open={eventDialogOpen}
        onOpenChange={handleEventDialogOpenChange}
        defaultDateKey={selectedKey}
        editingEvent={editingEvent}
        onCreate={createEvent}
        onUpdate={patchEvent}
      />
    </div>
  );
}
