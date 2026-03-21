import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { cn } from "../ui/utils";
import {
  searchPurchaseOrdersForSchedulePicker,
  type PurchaseOrderPickerRow,
} from "../../api/purchaseOrderPickerApi";
import { useLanguage } from "../../contexts/LanguageContext";

export type { PurchaseOrderPickerRow };

type PickerMode = "production" | "shipment" | "logistics";

function pickerRowLabel(row: PurchaseOrderPickerRow, mode: PickerMode): string {
  if (mode === "logistics" && row.packing_list_code?.trim()) {
    const lineName = (row.packing_line_product_name ?? row.product_name).trim();
    if (lineName) return `${row.packing_list_code.trim()} · ${lineName}`;
    return row.packing_list_code.trim();
  }
  const po = row.po_number.trim();
  const pn = row.product_name.trim();
  if (po && pn) return `${po} · ${pn}`;
  return po || pn || row.id;
}

function isSamePickerRow(
  selected: PurchaseOrderPickerRow | null,
  row: PurchaseOrderPickerRow,
  mode: PickerMode,
): boolean {
  if (!selected || selected.id !== row.id) return false;
  if (mode !== "logistics") return true;
  if (selected.packing_list_item_id && row.packing_list_item_id) {
    return selected.packing_list_item_id === row.packing_list_item_id;
  }
  return true;
}

type Props = {
  mode: PickerMode;
  value: PurchaseOrderPickerRow | null;
  onChange: (next: PurchaseOrderPickerRow | null) => void;
  /** 발주 검색 콤보박스(트리거)에만 적용 */
  comboboxClassName?: string;
};

/**
 * Dialog 안에서 Radix Popover(포털)를 쓰면 포커스 트랩과 충돌해 열림이 불안정해질 수 있어,
 * 동일 모달 DOM 안에 absolute 패널로 검색 목록을 띄웁니다.
 */
export function PurchaseOrderPicker({ mode, value, onChange, comboboxClassName }: Props) {
  const { t } = useLanguage();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [items, setItems] = useState<PurchaseOrderPickerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const tmr = setTimeout(() => setDebounced(search), 320);
    return () => clearTimeout(tmr);
  }, [search]);

  useEffect(() => {
    if (open) {
      setSearch("");
      setDebounced("");
      setErrorMessage(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const rows = await searchPurchaseOrdersForSchedulePicker(mode, debounced);
        if (!cancelled) setItems(rows);
      } catch (e) {
        if (!cancelled) {
          setItems([]);
          setErrorMessage(e instanceof Error ? e.message : t("common.error"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, mode, debounced]);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const hint =
    mode === "shipment"
      ? t("schedule.purchaseOrderHintShipment")
      : mode === "logistics"
        ? t("schedule.purchaseOrderHintLogistics")
        : t("schedule.purchaseOrderHintProduction");

  const display =
    value && (value.po_number || value.product_name || value.packing_list_code)
      ? pickerRowLabel(value, mode)
      : t("schedule.purchaseOrderPlaceholder");

  return (
    <div ref={rootRef} className="relative z-10 grid gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">{t("schedule.linkedPurchaseOrder")}</Label>
        {value && (
          <button
            type="button"
            className="text-xs text-gray-500 hover:text-gray-800"
            onClick={() => onChange(null)}
          >
            {t("schedule.clearPurchaseOrder")}
          </button>
        )}
      </div>
      <p className="text-xs text-gray-500">{hint}</p>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className={cn("w-full justify-between font-normal", comboboxClassName)}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="truncate text-left">{display}</span>
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div
          className="absolute left-0 right-0 top-full z-[80] mt-1 flex max-h-[min(320px,50vh)] flex-col overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md outline-none"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Command shouldFilter={false} className="flex max-h-[min(320px,50vh)] flex-col overflow-hidden">
            <CommandInput
              placeholder={
                mode === "logistics"
                  ? t("schedule.searchPurchaseOrderLogistics")
                  : t("schedule.searchPurchaseOrder")
              }
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-[260px] overflow-y-auto overflow-x-hidden">
              {loading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
              ) : (
                <>
                  {errorMessage && (
                    <div className="px-3 py-2 text-xs text-red-600">
                      {errorMessage}
                    </div>
                  )}
                  <CommandEmpty>{t("schedule.purchaseOrderEmpty")}</CommandEmpty>
                  <CommandGroup>
                    {items.map((po) => (
                      <CommandItem
                        key={po.packing_list_item_id ?? po.id}
                        value={po.packing_list_item_id ?? po.id}
                        onSelect={() => {
                          onChange(po);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 size-4 shrink-0",
                            isSamePickerRow(value, po, mode) ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="truncate">{pickerRowLabel(po, mode)}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
