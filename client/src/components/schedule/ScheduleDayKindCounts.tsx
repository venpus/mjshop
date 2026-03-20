import { cn } from "../ui/utils";
import { kindColors } from "./eventUtils";
import type { ScheduleEventKind } from "./types";
import { useLanguage } from "../../contexts/LanguageContext";

const KIND_ORDER: ScheduleEventKind[] = ["production", "shipment", "other"];

const LABEL_KEYS: Record<ScheduleEventKind, string> = {
  production: "schedule.kindProduction",
  shipment: "schedule.kindShipment",
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
      {kindsWithRecords.map((kind) => (
        <div
          key={kind}
          className={cn("flex items-baseline justify-between gap-0.5 px-0.5", kindColors(kind).text)}
        >
          <span className="min-w-0 truncate">{t(LABEL_KEYS[kind])}</span>
          <span className="shrink-0 font-medium tabular-nums">
            {counts[kind]}
            {suffix}
          </span>
        </div>
      ))}
    </div>
  );
}
