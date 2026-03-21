import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useLanguage } from "../../contexts/LanguageContext";
import type { CalendarHoliday } from "../../api/calendarHolidaysApi";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 신규 시 시작일 기본값 */
  defaultDateKey: string;
  /** 신규 시 종료일 기본값 (없으면 defaultDateKey) */
  defaultEndDateKey?: string;
  editingHoliday?: CalendarHoliday | null;
  onSave: (payload: { startDate: string; endDate: string; title: string; id?: string }) => void | Promise<void>;
};

export function ScheduleHolidayDialog({
  open,
  onOpenChange,
  defaultDateKey,
  defaultEndDateKey,
  editingHoliday = null,
  onSave,
}: Props) {
  const { t } = useLanguage();
  const [startKey, setStartKey] = useState(defaultDateKey);
  const [endKey, setEndKey] = useState(defaultEndDateKey ?? defaultDateKey);
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editingHoliday) {
      setStartKey(editingHoliday.startDate);
      setEndKey(editingHoliday.endDate);
      setTitle(editingHoliday.title);
    } else {
      setStartKey(defaultDateKey);
      setEndKey(defaultEndDateKey ?? defaultDateKey);
      setTitle("");
    }
  }, [open, defaultDateKey, defaultEndDateKey, editingHoliday]);

  const handleSave = async () => {
    const s = startKey.trim();
    const e = endKey.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !/^\d{4}-\d{2}-\d{2}$/.test(e)) {
      window.alert(t("schedule.holidayDateInvalid"));
      return;
    }
    const lo = s <= e ? s : e;
    const hi = s <= e ? e : s;
    try {
      await Promise.resolve(
        onSave({
          startDate: lo,
          endDate: hi,
          title: title.trim(),
          id: editingHoliday?.id,
        }),
      );
      onOpenChange(false);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : t("common.error"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingHoliday ? t("schedule.holidayDialogEditTitle") : t("schedule.holidayDialogAddTitle")}
          </DialogTitle>
          <DialogDescription>{t("schedule.holidayDialogDescription")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="holiday-start">{t("schedule.holidayFieldStartDate")}</Label>
              <Input id="holiday-start" type="date" value={startKey} onChange={(e) => setStartKey(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="holiday-end">{t("schedule.holidayFieldEndDate")}</Label>
              <Input id="holiday-end" type="date" value={endKey} onChange={(e) => setEndKey(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="holiday-title">{t("schedule.holidayFieldTitle")}</Label>
            <Input
              id="holiday-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("schedule.holidayFieldTitlePlaceholder")}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={() => void handleSave()}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
