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
  /** 월 그리드 셀: 유형 칩을 2열로 배치 */
  columns?: 1 | 2;
};

/** 달력 칸 안- 건수가 1 이상인 유형만 표시 (전부 0이면 렌더 없음) */
export function ScheduleDayKindCounts({
  counts,
  className,
  size = "month",
  columns = 1,
}: Props) {
  const { t } = useLanguage();
  const suffix = t("schedule.countSuffix");
  const kindsWithRecords = KIND_ORDER.filter((kind) => counts[kind] > 0);
  if (kindsWithRecords.length === 0) return null;

  const textSize =
    size === "compact"
      ? "text-[10px] leading-snug sm:text-xs"
      : "text-xs leading-snug sm:text-sm md:text-[13px]";

  const chipInner = (kind: (typeof kindsWithRecords)[number]) => {
    const colors = kindColors(kind);
    const compactChip = columns === 2 && size === "month";
    return (
      <div
        key={kind}
        className={cn(
          "flex min-w-0 justify-between font-bold tabular-nums shadow-sm",
          compactChip
            ? "items-center gap-0.5 rounded px-1 py-0.5 sm:px-1.5"
            : "items-baseline gap-1 rounded px-1.5 py-1",
          colors.chip,
        )}
      >
        <span className={cn("min-w-0 flex-1", compactChip ? "truncate" : "break-words")}>
          {t(LABEL_KEYS[kind])}
        </span>
        <span className="shrink-0">
          {counts[kind]}
          {suffix}
        </span>
      </div>
    );
  };

  if (columns === 2 && size === "month") {
    return (
      <div className={cn("grid w-full min-w-0 grid-cols-2 gap-x-1 gap-y-1", textSize, className)}>
        {kindsWithRecords.map((kind) => chipInner(kind))}
      </div>
    );
  }

  return (
    <div className={cn("w-full min-w-0 space-y-1.5", textSize, className)}>
      {kindsWithRecords.map((kind) => chipInner(kind))}
    </div>
  );
}
