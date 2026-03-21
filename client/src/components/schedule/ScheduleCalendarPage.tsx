import { useCallback, useEffect, useMemo, useState } from "react";
import { useForceMobileLayout } from "../../hooks/useForceMobileLayout";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  createCalendarHoliday,
  deleteCalendarHoliday,
  fetchCalendarHolidays,
  updateCalendarHoliday,
  type CalendarHoliday,
} from "../../api/calendarHolidaysApi";
import {
  createScheduleEvent,
  deleteScheduleEvent,
  fetchScheduleEventById,
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
import { ScheduleCalendarMainPane } from "./ScheduleCalendarMainPane";
import { MonthGridCalendar } from "./MonthGridCalendar";
import { WeekStrip } from "./WeekStrip";
import { ScheduleDayContent } from "./ScheduleDayContent";
import { ScheduleAddEventDialog } from "./ScheduleAddEventDialog";
import { ScheduleHolidayDialog } from "./ScheduleHolidayDialog";
import { holidaysCoveringDateKey } from "./holidayUtils";
import type { ScheduleEvent, ScheduleEventKind, ScheduleFiltersState } from "./types";
import { DEFAULT_SCHEDULE_FILTERS } from "./types";

export function ScheduleCalendarPage() {
  const { t } = useLanguage();
  const isMobileLayout = useForceMobileLayout();

  const [cursorMonth, setCursorMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [filters, setFilters] = useState<ScheduleFiltersState>(DEFAULT_SCHEDULE_FILTERS);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [holidays, setHolidays] = useState<CalendarHoliday[]>([]);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [holidayMenu, setHolidayMenu] = useState<{ x: number; y: number; dateKey: string } | null>(null);
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [holidayDialogEditing, setHolidayDialogEditing] = useState<CalendarHoliday | null>(null);
  const [holidayDialogSeedDate, setHolidayDialogSeedDate] = useState("");

  const menuDayHolidays = useMemo(() => {
    if (!holidayMenu) return [];
    return holidaysCoveringDateKey(holidays, holidayMenu.dateKey);
  }, [holidayMenu, holidays]);

  const loadEvents = useCallback(
    async (includeRange?: { startDateKey: string; endDateKey: string }) => {
      setLoading(true);
      setLoadError(null);
      try {
        const viewport = getCalendarViewportBounds(cursorMonth);
        const { fromKey, toKey } = includeRange
          ? mergeViewportWithEventRange(viewport, includeRange.startDateKey, includeRange.endDateKey)
          : viewport;
        const [evRes, holRes] = await Promise.allSettled([
          fetchScheduleEvents(fromKey, toKey),
          fetchCalendarHolidays(fromKey, toKey),
        ]);
        if (evRes.status === "rejected") {
          throw evRes.reason;
        }
        setEvents(evRes.value);
        setHolidays(holRes.status === "fulfilled" ? holRes.value : []);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : t("common.error"));
        setEvents([]);
        setHolidays([]);
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
  const holidaysOnSelectedDay = useMemo(
    () => holidaysCoveringDateKey(holidays, selectedKey),
    [holidays, selectedKey],
  );
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
    transitDays?: number;
  }) => {
    const id = `u-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const { pairedDateKey } = await createScheduleEvent({
      id,
      title: payload.title,
      kind: payload.kind,
      startDateKey: payload.startDateKey,
      endDateKey: payload.endDateKey,
      note: payload.note || undefined,
      purchaseOrderId: payload.purchaseOrderId ?? undefined,
      transitDays: payload.transitDays,
    });
    const viewport = getCalendarViewportBounds(cursorMonth);
    let merged = mergeViewportWithEventRange(viewport, payload.startDateKey, payload.endDateKey);
    if (pairedDateKey) {
      merged = mergeViewportWithEventRange(merged, pairedDateKey, pairedDateKey);
    }
    await loadEvents({ startDateKey: merged.fromKey, endDateKey: merged.toKey });
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
      transitDays?: number;
    },
  ) => {
    const { pairedDateKey } = await updateScheduleEvent(eventId, {
      title: payload.title,
      kind: payload.kind,
      startDateKey: payload.startDateKey,
      endDateKey: payload.endDateKey,
      note: payload.note || undefined,
      purchaseOrderId: payload.purchaseOrderId ?? undefined,
      transitDays: payload.transitDays,
    });
    const viewport = getCalendarViewportBounds(cursorMonth);
    let merged = mergeViewportWithEventRange(viewport, payload.startDateKey, payload.endDateKey);
    if (pairedDateKey) {
      merged = mergeViewportWithEventRange(merged, pairedDateKey, pairedDateKey);
    }
    await loadEvents({ startDateKey: merged.fromKey, endDateKey: merged.toKey });
  };

  const openCreateDialog = () => {
    setEditingEvent(null);
    setEventDialogOpen(true);
  };

  const openEditDialog = (ev: ScheduleEvent) => {
    void (async () => {
      if (ev.kind === "korea_arrival_expected" && ev.pairedEventId) {
        try {
          const dispatch = await fetchScheduleEventById(ev.pairedEventId);
          if (dispatch) {
            setEditingEvent(dispatch);
            setEventDialogOpen(true);
            return;
          }
        } catch {
          /* 물류발송 단건 조회 실패 시 아래에서 그대로 편집 시도 */
        }
      }
      setEditingEvent(ev);
      setEventDialogOpen(true);
    })();
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

  useEffect(() => {
    if (!holidayMenu) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHolidayMenu(null);
    };
    const onScroll = () => setHolidayMenu(null);
    window.addEventListener("keydown", onEsc);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("keydown", onEsc);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [holidayMenu]);

  const openHolidayDialogCreate = (dateKey: string) => {
    setHolidayMenu(null);
    setHolidayDialogEditing(null);
    setHolidayDialogSeedDate(dateKey);
    setHolidayDialogOpen(true);
  };

  const openHolidayDialogEdit = (h: CalendarHoliday) => {
    setHolidayMenu(null);
    setHolidayDialogEditing(h);
    setHolidayDialogSeedDate(h.startDate);
    setHolidayDialogOpen(true);
  };

  const handleHolidaySave = async (payload: {
    startDate: string;
    endDate: string;
    title: string;
    id?: string;
  }) => {
    if (payload.id) {
      await updateCalendarHoliday(payload.id, {
        startDate: payload.startDate,
        endDate: payload.endDate,
        title: payload.title,
      });
    } else {
      await createCalendarHoliday({
        startDate: payload.startDate,
        endDate: payload.endDate,
        title: payload.title,
      });
    }
    await loadEvents();
  };

  const removeHoliday = async (id: string) => {
    if (!window.confirm(t("schedule.holidayRemoveConfirm"))) return;
    try {
      setHolidayMenu(null);
      await deleteCalendarHoliday(id);
      await loadEvents();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : t("common.error"));
    }
  };

  const onCalendarCellContextMenu = (d: Date, clientX: number, clientY: number) => {
    setHolidayMenu({ x: clientX, y: clientY, dateKey: toDateKey(d) });
  };

  return (
    <div className="flex min-h-full flex-col gap-4 p-4 lg:h-full lg:min-h-0 lg:flex-row lg:gap-6 lg:p-6">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
        <div className="shrink-0">
          <h1 className="text-xl font-bold text-gray-900">{t("schedule.pageTitle")}</h1>
          <p className="mt-1 text-sm text-gray-500">{t("schedule.pageSubtitle")}</p>
        </div>

        <div className="shrink-0">
          <ScheduleMonthHeader month={cursorMonth} onPrevMonth={prevMonth} onNextMonth={nextMonth} onToday={goToday} />
        </div>

        <div className="shrink-0">
          <ScheduleFilters value={filters} onChange={setFilters} />
        </div>

        {loadError && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <span className="flex-1">{loadError}</span>
            <button type="button" className="font-medium text-red-900 underline" onClick={() => void loadEvents()}>
              {t("schedule.retryLoad")}
            </button>
          </div>
        )}

        {loading ? (
          <p className="shrink-0 text-sm text-gray-500">{t("common.loading")}</p>
        ) : (
          <ScheduleCalendarMainPane>
            {isMobileLayout ? (
              <WeekStrip
                selectedDate={selectedDate}
                onSelectDate={selectDate}
                events={events}
                filters={filters}
                holidays={holidays}
                onCellContextMenu={onCalendarCellContextMenu}
                className="min-h-[min(55dvh,28rem)] sm:min-h-[min(50dvh,26rem)]"
              />
            ) : (
              <MonthGridCalendar
                month={cursorMonth}
                selectedDate={selectedDate}
                onSelectDate={selectDate}
                events={events}
                filters={filters}
                holidays={holidays}
                onCellContextMenu={onCalendarCellContextMenu}
                className="min-h-0 flex-1"
              />
            )}
          </ScheduleCalendarMainPane>
        )}
      </div>

      <aside
        className={
          isMobileLayout
            ? "w-full shrink-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            : "hidden max-h-full w-full max-w-[29.04rem] shrink-0 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:block lg:self-stretch"
        }
      >
        <ScheduleDayContent
          date={selectedDate}
          events={dayEvents}
          onAddClick={openCreateDialog}
          onEdit={openEditDialog}
          onRemove={removeEvent}
          selectedHolidays={holidaysOnSelectedDay}
          onHolidayAdd={() => openHolidayDialogCreate(selectedKey)}
          onHolidayEdit={(h) => openHolidayDialogEdit(h)}
          onHolidayRemove={(id) => void removeHoliday(id)}
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

      {holidayMenu && (
        <>
          <div className="fixed inset-0 z-[100]" aria-hidden onClick={() => setHolidayMenu(null)} />
          <div
            role="menu"
            className="fixed z-[101] min-w-[13rem] max-w-[min(20rem,calc(100vw-1rem))] rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg"
            style={{ left: holidayMenu.x, top: holidayMenu.y }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left hover:bg-gray-100"
              onClick={() => openHolidayDialogCreate(holidayMenu.dateKey)}
            >
              {t("schedule.holidayContextAdd")}
            </button>
            {menuDayHolidays.length > 0 && (
              <div className="border-t border-gray-100 pt-1">
                {menuDayHolidays.map((h) => (
                  <div key={h.id} className="border-b border-gray-50 last:border-b-0">
                    <button
                      type="button"
                      role="menuitem"
                      className="block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100"
                      onClick={() => openHolidayDialogEdit(h)}
                    >
                      {t("schedule.holidayContextEdit")} · {h.title?.trim() || "—"}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="block w-full px-3 py-1.5 text-left text-xs text-red-700 hover:bg-red-50"
                      onClick={() => void removeHoliday(h.id)}
                    >
                      {t("schedule.holidayContextRemove")} · {h.title?.trim() || "—"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <ScheduleHolidayDialog
        open={holidayDialogOpen}
        onOpenChange={(open) => {
          setHolidayDialogOpen(open);
          if (!open) setHolidayDialogEditing(null);
        }}
        defaultDateKey={holidayDialogSeedDate || selectedKey}
        editingHoliday={holidayDialogEditing}
        onSave={handleHolidaySave}
      />
    </div>
  );
}
