import { cn } from "../ui/utils";
import { kindColors } from "./eventUtils";
import type { ScheduleEventKind } from "./types";
import { useLanguage } from "../../contexts/LanguageContext";

const KIND_ORDER: ScheduleEventKind[] = [
  "production",
  "shipment",
  "logistics_dispatch",
  "korea_arrival_expected",
  "other",
];

const LABEL_KEYS: Record<ScheduleEventKind, string> = {
  production: "schedule.kindProduction",
  shipment: "schedule.kindShipment",
  logistics_dispatch: "schedule.kindLogisticsDispatch",
  korea_arrival_expected: "schedule.kindKoreaArrivalExpected",
  other: "schedule.kindOther",
};

type Props = {
  counts: Record<ScheduleEventKind, number>;
  className?: string;
};

/** 달력 칸 안- 건수가 1 이상인 유형만 표시 (전부 0이면 렌더 없음) */
export function ScheduleDayKindCounts({ counts, className }: Props) {
  const { t } = useLanguage();
  const suffix = t("schedule.countSuffix");
  const kindsWithRecords = KIND_ORDER.filter((kind) => counts[kind] > 0);
  if (kindsWithRecords.length === 0) return null;

  return (
    <div className={cn("w-full space-y-0.5 text-[8px] leading-tight md:text-[9px]", className)}>
      {kindsWithRecords.map((kind) => {
        const colors = kindColors(kind);
        return (
          <div
            key={kind}
            className={cn(
              "flex items-baseline justify-between gap-0.5 rounded px-1 py-0.5 font-bold tabular-nums shadow-sm",
              colors.chip,
            )}
          >
            <span className="min-w-0 truncate">{t(LABEL_KEYS[kind])}</span>
            <span className="shrink-0">
              {counts[kind]}
              {suffix}
            </span>
          </div>
        );
      })}
    </div>
  );
}
