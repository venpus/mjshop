import { Pencil, Plus } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";
import { formatScheduleDateRangeLabel } from "./dateUtils";
import { kindColors, normalizeScheduleEventKind } from "./eventUtils";
import type { ScheduleEvent } from "./types";
import { useLanguage } from "../../contexts/LanguageContext";

type Props = {
  date: Date;
  events: ScheduleEvent[];
  onAddClick: () => void;
  onEdit?: (event: ScheduleEvent) => void;
  onRemove?: (id: string) => void;
  className?: string;
};

export function ScheduleDayContent({ date, events, onAddClick, onEdit, onRemove, className }: Props) {
  const { t, language } = useLanguage();
  const title = date.toLocaleDateString(language === "zh" ? "zh-CN" : "ko-KR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("schedule.selectedDay")}</p>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
        </div>
        <Button type="button" size="sm" className="gap-1 shrink-0" onClick={onAddClick}>
          <Plus className="size-4" />
          {t("schedule.addEvent")}
        </Button>
      </div>

      {events.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-3 py-3 text-sm text-gray-500">
          {t("schedule.noEvents")}
        </p>
      ) : (
        <ul className="space-y-2">
          {events.map((e) => {
            const colors = kindColors(normalizeScheduleEventKind(e.kind));
            return (
              <li
                key={e.id}
                className={cn(
                  "flex items-start justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm",
                  colors.bgSoft,
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2 rounded-full shrink-0", colors.dot)} />
                    <span className={cn("font-medium", colors.text)}>{e.title}</span>
                  </div>
                  <p className="mt-0.5 pl-4 text-xs text-gray-600">
                    {formatScheduleDateRangeLabel(e.startDateKey, e.endDateKey, language)}
                  </p>
                  {e.purchaseOrderId && (e.poNumber || e.productName) && (
                    <p className="mt-0.5 pl-4 text-xs text-gray-600">
                      {t("schedule.linkedPoLine")}: {e.poNumber}
                      {e.productName ? ` · ${e.productName}` : ""}
                    </p>
                  )}
                  {e.note && <p className="mt-0.5 pl-4 text-xs text-gray-600">{e.note}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {onEdit && (
                    <button
                      type="button"
                      className="flex items-center gap-0.5 text-xs text-gray-600 hover:text-gray-900 hover:underline"
                      onClick={() => onEdit(e)}
                    >
                      <Pencil className="size-3.5" />
                      {t("common.edit")}
                    </button>
                  )}
                  {onRemove && (
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline"
                      onClick={() => onRemove(e.id)}
                    >
                      {t("common.delete")}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
