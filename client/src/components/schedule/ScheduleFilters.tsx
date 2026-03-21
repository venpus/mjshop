import type { ReactNode } from "react";
import { Factory, LayoutGrid, Package, Plane, StickyNote, Truck } from "lucide-react";
import { cn } from "../ui/utils";
import type { ScheduleEventKind, ScheduleFiltersState } from "./types";
import { KINDS_ALL_FALSE } from "./types";
import { useLanguage } from "../../contexts/LanguageContext";

type Props = {
  value: ScheduleFiltersState;
  onChange: (next: ScheduleFiltersState) => void;
  className?: string;
};

const KIND: ScheduleEventKind[] = [
  "production",
  "shipment",
  "logistics_dispatch",
  "korea_arrival_expected",
  "other",
];

const ICON: Record<ScheduleEventKind, ReactNode> = {
  production: <Factory className="size-3.5 md:size-4 shrink-0" />,
  shipment: <Package className="size-3.5 md:size-4 shrink-0" />,
  logistics_dispatch: <Truck className="size-3.5 md:size-4 shrink-0" />,
  korea_arrival_expected: <Plane className="size-3.5 md:size-4 shrink-0" />,
  other: <StickyNote className="size-3.5 md:size-4 shrink-0" />,
};

export function ScheduleFilters({ value, onChange, className }: Props) {
  const { t } = useLanguage();

  const label = (k: ScheduleEventKind) => {
    switch (k) {
      case "production":
        return t("schedule.kindProduction");
      case "shipment":
        return t("schedule.kindShipment");
      case "logistics_dispatch":
        return t("schedule.kindLogisticsDispatch");
      case "korea_arrival_expected":
        return t("schedule.kindKoreaArrivalExpected");
      default:
        return t("schedule.kindOther");
    }
  };

  const selectAll = () => {
    onChange({
      mode: "all",
      kinds: value.kinds,
    });
  };

  const onKindClick = (k: ScheduleEventKind) => {
    if (value.mode === "all") {
      onChange({
        mode: "kinds",
        kinds: { ...KINDS_ALL_FALSE, [k]: true },
      });
      return;
    }

    const currentlyOn = value.kinds[k];
    if (currentlyOn) {
      const numOn = KIND.filter((x) => value.kinds[x]).length;
      if (numOn <= 1) return;
    }
    onChange({
      ...value,
      kinds: { ...value.kinds, [k]: !currentlyOn },
    });
  };

  const isAllMode = value.mode === "all";

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <button
        type="button"
        onClick={selectAll}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors md:text-sm",
          isAllMode
            ? "border-purple-200 bg-purple-50 text-purple-800"
            : "border-gray-200 bg-white text-gray-400 hover:text-gray-600",
        )}
      >
        <LayoutGrid className="size-3.5 md:size-4 shrink-0" />
        {t("schedule.filterAll")}
      </button>
      {KIND.map((k) => {
        const onInKindsMode = value.mode === "kinds" && value.kinds[k];
        return (
          <button
            key={k}
            type="button"
            onClick={() => onKindClick(k)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors md:text-sm",
              isAllMode &&
                "pointer-events-auto cursor-pointer border-gray-200 bg-gray-50/80 text-gray-400 opacity-70 hover:opacity-100",
              !isAllMode &&
                (onInKindsMode
                  ? "border-purple-200 bg-purple-50 text-purple-800"
                  : "border-gray-200 bg-white text-gray-400 line-through"),
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
