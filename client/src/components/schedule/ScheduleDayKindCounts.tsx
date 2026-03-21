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
  /** 주간 스트립(좁은 칸)은 compact, 월 그리드는 month */
  size?: "compact" | "month";
};

/** 달력 칸 안- 건수가 1 이상인 유형만 표시 (전부 0이면 렌더 없음) */
export function ScheduleDayKindCounts({ counts, className, size = "month" }: Props) {
  const { t } = useLanguage();
  const suffix = t("schedule.countSuffix");
  const kindsWithRecords = KIND_ORDER.filter((kind) => counts[kind] > 0);
  if (kindsWithRecords.length === 0) return null;

  const textSize =
    size === "compact"
      ? "text-[10px] leading-snug sm:text-xs"
      : "text-xs leading-snug sm:text-sm md:text-[13px]";

  return (
    <div className={cn("w-full min-w-0 space-y-1", textSize, className)}>
      {kindsWithRecords.map((kind) => {
        const colors = kindColors(kind);
        return (
          <div
            key={kind}
            className={cn(
              "flex min-w-0 items-baseline justify-between gap-1 rounded px-1.5 py-1 font-bold tabular-nums shadow-sm",
              colors.chip,
            )}
          >
            <span className="min-w-0 flex-1 break-words">{t(LABEL_KEYS[kind])}</span>
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
