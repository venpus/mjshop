import type { ReactNode } from "react";
import { Factory, Package, StickyNote } from "lucide-react";
import { cn } from "../ui/utils";
import type { ScheduleEventKind, ScheduleFiltersState } from "./types";
import { useLanguage } from "../../contexts/LanguageContext";

type Props = {
  value: ScheduleFiltersState;
  onChange: (next: ScheduleFiltersState) => void;
  className?: string;
};

const KIND: ScheduleEventKind[] = ["production", "shipment", "other"];

const ICON: Record<ScheduleEventKind, ReactNode> = {
  production: <Factory className="size-3.5 md:size-4 shrink-0" />,
  shipment: <Package className="size-3.5 md:size-4 shrink-0" />,
  other: <StickyNote className="size-3.5 md:size-4 shrink-0" />,
};

export function ScheduleFilters({ value, onChange, className }: Props) {
  const { t } = useLanguage();

  const label = (k: ScheduleEventKind) =>
    k === "production" ? t("schedule.kindProduction") : k === "shipment" ? t("schedule.kindShipment") : t("schedule.kindOther");

  const toggle = (k: ScheduleEventKind) => {
    onChange({ ...value, [k]: !value[k] });
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {KIND.map((k) => {
        const on = value[k];
        return (
          <button
            key={k}
            type="button"
            onClick={() => toggle(k)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors md:text-sm",
              on
                ? "border-purple-200 bg-purple-50 text-purple-800"
                : "border-gray-200 bg-white text-gray-400 line-through",
            )}
          >
            {ICON[k]}
            {label(k)}
          </button>
        );
      })}
    </div>
  );
}
