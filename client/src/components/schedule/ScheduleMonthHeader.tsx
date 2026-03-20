import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";
import { useLanguage } from "../../contexts/LanguageContext";

type Props = {
  month: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
};

export function ScheduleMonthHeader({ month, onPrevMonth, onNextMonth, onToday }: Props) {
  const { t, language } = useLanguage();
  const label = month.toLocaleDateString(language === "zh" ? "zh-CN" : "ko-KR", {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-1 sm:gap-2">
        <Button type="button" variant="outline" size="icon" className="size-9 shrink-0" onClick={onPrevMonth}>
          <ChevronLeft className="size-4" />
        </Button>
        <h2 className="text-lg font-semibold text-gray-900 min-w-[8rem] text-center sm:min-w-[10rem]">
          {label}
        </h2>
        <Button type="button" variant="outline" size="icon" className="size-9 shrink-0" onClick={onNextMonth}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <Button type="button" variant="secondary" className="text-sm" onClick={onToday}>
        {t("schedule.today")}
      </Button>
    </div>
  );
}
