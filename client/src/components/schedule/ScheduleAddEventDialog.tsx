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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useLanguage } from "../../contexts/LanguageContext";
import type { ScheduleEvent, ScheduleEventKind } from "./types";
import { PurchaseOrderPicker, type PurchaseOrderPickerRow } from "./PurchaseOrderPicker";

function titleFromPurchaseOrder(po: PurchaseOrderPickerRow): string {
  const label = `[${po.po_number}] ${po.product_name}`.trim();
  return (label || po.id).slice(0, 500);
}

export type ScheduleAddPayload = {
  title: string;
  kind: ScheduleEventKind;
  note: string;
  startDateKey: string;
  endDateKey: string;
  purchaseOrderId?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDateKey: string;
  /** 수정 모드일 때 채워 넣을 기존 일정 */
  editingEvent?: ScheduleEvent | null;
  onCreate: (payload: ScheduleAddPayload) => void | Promise<void>;
  onUpdate?: (id: string, payload: ScheduleAddPayload) => void | Promise<void>;
};

export function ScheduleAddEventDialog({
  open,
  onOpenChange,
  defaultDateKey,
  editingEvent = null,
  onCreate,
  onUpdate,
}: Props) {
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ScheduleEventKind>("production");
  const [note, setNote] = useState("");
  const [startDateKey, setStartDateKey] = useState(defaultDateKey);
  const [endDateKey, setEndDateKey] = useState(defaultDateKey);
  const [linkedPo, setLinkedPo] = useState<PurchaseOrderPickerRow | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editingEvent) {
      setKind(editingEvent.kind);
      setNote(editingEvent.note ?? "");
      setStartDateKey(editingEvent.startDateKey);
      setEndDateKey(editingEvent.endDateKey);
      if (editingEvent.kind === "other") {
        setTitle(editingEvent.title);
        setLinkedPo(null);
      } else {
        setTitle("");
        setLinkedPo(
          editingEvent.purchaseOrderId
            ? {
                id: editingEvent.purchaseOrderId,
                po_number: editingEvent.poNumber ?? "",
                product_name: editingEvent.productName ?? "",
              }
            : null,
        );
      }
    } else {
      setTitle("");
      setKind("production");
      setNote("");
      setStartDateKey(defaultDateKey);
      setEndDateKey(defaultDateKey);
      setLinkedPo(null);
    }
  }, [open, defaultDateKey, editingEvent]);

  useEffect(() => {
    if (!open || editingEvent) return;
    if (kind === "other") {
      setLinkedPo(null);
    } else {
      setTitle("");
    }
  }, [kind, open, editingEvent]);

  const handleSave = async () => {
    let resolvedTitle: string;
    let purchaseOrderId: string | null = null;

    if (kind === "other") {
      const trimmed = title.trim();
      if (!trimmed) return;
      resolvedTitle = trimmed;
    } else {
      if (linkedPo) {
        resolvedTitle = titleFromPurchaseOrder(linkedPo);
        purchaseOrderId = linkedPo.id;
      } else if (editingEvent) {
        resolvedTitle = editingEvent.title;
        purchaseOrderId = editingEvent.purchaseOrderId ?? null;
      } else {
        return;
      }
    }

    let start = startDateKey;
    let end = endDateKey;
    if (end < start) {
      const tmp = start;
      start = end;
      end = tmp;
    }
    const payload: ScheduleAddPayload = {
      title: resolvedTitle,
      kind,
      note: note.trim(),
      startDateKey: start,
      endDateKey: end,
      purchaseOrderId,
    };
    try {
      if (editingEvent) {
        await Promise.resolve(onUpdate?.(editingEvent.id, payload));
      } else {
        await Promise.resolve(onCreate(payload));
      }
      onOpenChange(false);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : t("common.error"));
    }
  };

  const canSave =
    kind === "other"
      ? Boolean(title.trim())
      : Boolean(linkedPo) || Boolean(editingEvent);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-visible">
        <DialogHeader>
          <DialogTitle>{editingEvent ? t("schedule.dialogEditTitle") : t("schedule.dialogAddTitle")}</DialogTitle>
          <DialogDescription>{t("schedule.dialogDescription")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="sched-start">{t("schedule.fieldStartDate")}</Label>
              <Input
                id="sched-start"
                type="date"
                value={startDateKey}
                onChange={(e) => setStartDateKey(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sched-end">{t("schedule.fieldEndDate")}</Label>
              <Input
                id="sched-end"
                type="date"
                value={endDateKey}
                onChange={(e) => setEndDateKey(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>{t("schedule.fieldKind")}</Label>
            <Select
              value={kind}
              onValueChange={(v) => setKind(v as ScheduleEventKind)}
              disabled={Boolean(editingEvent)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="production">{t("schedule.kindProduction")}</SelectItem>
                <SelectItem value="shipment">{t("schedule.kindShipment")}</SelectItem>
                <SelectItem value="other">{t("schedule.kindOther")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {kind === "other" ? (
            <div className="grid gap-1.5">
              <Label htmlFor="sched-title">{t("schedule.fieldTitleOther")}</Label>
              <Input
                id="sched-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("schedule.fieldTitleOtherPlaceholder")}
                autoFocus
              />
              <p className="text-xs text-gray-500">{t("schedule.fieldTitleOtherHint")}</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600">{t("schedule.titleDerivedFromPo")}</p>
              <PurchaseOrderPicker
                mode={kind === "shipment" ? "shipment" : "production"}
                value={linkedPo}
                onChange={setLinkedPo}
              />
            </>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="sched-note">{t("schedule.fieldNote")}</Label>
            <Input
              id="sched-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("schedule.fieldNotePlaceholder")}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={handleSave} disabled={!canSave}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
