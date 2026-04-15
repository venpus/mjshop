import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  getSweetTrackerCachedInvoices,
  parsePackingListCodesInput,
  patchSweetTrackerInvoicePackingListCodes,
  postSweetTrackerBulkDeliveryCompleted,
  type SweetTrackerCachedInvoiceItem,
} from '../../api/sweetTrackerApi';
import { SweetTrackerCachedInvoicesTable } from './SweetTrackerCachedInvoicesTable';
import { SweetTrackerPackingListPickerModal } from './SweetTrackerPackingListPickerModal';

const PAGE_LIMIT = 300;
const MAX_PACKING_LIST_CODES = 40;

function sameStringArrayOrder(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export interface SweetTrackerCachedListPanelProps {
  /** 값이 바뀔 때마다 목록을 다시 불러옵니다 (대량 조회 성공 후 갱신 등). */
  reloadKey?: number;
}

export function SweetTrackerCachedListPanel({ reloadKey = 0 }: SweetTrackerCachedListPanelProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [items, setItems] = useState<SweetTrackerCachedInvoiceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyInvoiceNo, setBusyInvoiceNo] = useState<string | null>(null);
  const [packingDraftByInvoice, setPackingDraftByInvoice] = useState<Record<string, string>>({});
  const [pickerInvoiceNo, setPickerInvoiceNo] = useState<string | null>(null);
  const [pickerInitialCodes, setPickerInitialCodes] = useState<string[]>([]);

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const latestPackingTextRef = useRef<Record<string, string>>({});
  const packingDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const packingSaveGenRef = useRef<Record<string, number>>({});

  const load = useCallback(
    async (fromOffset: number, append: boolean) => {
      setError(null);
      setLoading(true);
      try {
        const json = await getSweetTrackerCachedInvoices(user?.id, {
          limit: PAGE_LIMIT,
          offset: fromOffset,
        });
        setTotal(json.data.total);
        if (append) {
          setItems((prev) => [...prev, ...json.data.items]);
        } else {
          setItems(json.data.items);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        if (!append) {
          setItems([]);
          setTotal(0);
        }
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    void load(0, false);
  }, [reloadKey, load]);

  useEffect(() => {
    const timers = packingDebounceRef.current;
    return () => {
      for (const k of Object.keys(timers)) {
        clearTimeout(timers[k]!);
        delete timers[k];
      }
    };
  }, []);

  const hasMore = items.length < total;
  const loadMore = useCallback(() => {
    if (items.length >= total || loading) return;
    void load(items.length, true);
  }, [items.length, total, loading, load]);

  const handleLookupOne = async (invoiceNo: string) => {
    setBusyInvoiceNo(invoiceNo);
    setError(null);
    try {
      await postSweetTrackerBulkDeliveryCompleted(user?.id, [invoiceNo]);
      await load(0, false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyInvoiceNo(null);
    }
  };

  const flushPackingAutosave = useCallback(
    async (invoiceNo: string) => {
      const row = itemsRef.current.find((x) => x.invoiceNo === invoiceNo);
      const raw = latestPackingTextRef.current[invoiceNo] ?? '';
      const codes = parsePackingListCodesInput(raw);
      if (codes.length > MAX_PACKING_LIST_CODES) {
        setError(
          t('sweetTracker.cacheList.packingCodesTooMany').replace('{max}', String(MAX_PACKING_LIST_CODES))
        );
        return;
      }
      const prevCodes = row?.packingListCodes ?? [];
      if (sameStringArrayOrder(codes, prevCodes)) {
        setPackingDraftByInvoice((prev) => {
          if (prev[invoiceNo] === undefined) return prev;
          const next = { ...prev };
          delete next[invoiceNo];
          return next;
        });
        return;
      }

      packingSaveGenRef.current[invoiceNo] = (packingSaveGenRef.current[invoiceNo] ?? 0) + 1;
      const gen = packingSaveGenRef.current[invoiceNo];

      setError(null);
      try {
        await patchSweetTrackerInvoicePackingListCodes(user?.id, invoiceNo, codes);
        if (packingSaveGenRef.current[invoiceNo] !== gen) return;

        setItems((prev) =>
          prev.map((it) => (it.invoiceNo === invoiceNo ? { ...it, packingListCodes: codes } : it))
        );
        setPackingDraftByInvoice((prev) => {
          const draft = prev[invoiceNo];
          if (draft === undefined) return prev;
          const draftCodes = parsePackingListCodesInput(draft);
          if (sameStringArrayOrder(draftCodes, codes)) {
            const next = { ...prev };
            delete next[invoiceNo];
            return next;
          }
          return prev;
        });
      } catch (e) {
        if (packingSaveGenRef.current[invoiceNo] === gen) {
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    },
    [user?.id, t]
  );

  const openPackingPicker = (invoiceNo: string) => {
    const row = items.find((i) => i.invoiceNo === invoiceNo);
    const draftText = packingDraftByInvoice[invoiceNo];
    const text =
      draftText !== undefined
        ? draftText
        : row?.packingListCodes?.length
          ? row.packingListCodes.join(', ')
          : '';
    setPickerInitialCodes(parsePackingListCodesInput(text));
    setPickerInvoiceNo(invoiceNo);
  };

  const closePackingPicker = () => setPickerInvoiceNo(null);

  const applyPackingPickerSelection = async (codes: string[]) => {
    const inv = pickerInvoiceNo;
    if (!inv) return;
    const joined = codes.join(', ');
    latestPackingTextRef.current[inv] = joined;
    setPackingDraftByInvoice((prev) => ({ ...prev, [inv]: joined }));
    const tid = packingDebounceRef.current[inv];
    if (tid) clearTimeout(tid);
    delete packingDebounceRef.current[inv];
    await flushPackingAutosave(inv);
  };

  return (
    <section className="mt-10 border-t border-gray-200 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('sweetTracker.cacheList.title')}</h2>
        </div>
        <button
          type="button"
          onClick={() => void load(0, false)}
          disabled={loading}
          className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? t('sweetTracker.cacheList.loading') : t('sweetTracker.cacheList.refresh')}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="mt-4 text-sm text-gray-500">{t('sweetTracker.cacheList.empty')}</p>
      )}

      {total > 0 && (
        <p className="mt-3 text-xs text-gray-500">
          {t('sweetTracker.cacheList.totalNote')
            .replace('{shown}', String(items.length))
            .replace('{total}', String(total))}
        </p>
      )}

      <SweetTrackerCachedInvoicesTable
        t={t}
        items={items}
        busyInvoiceNo={busyInvoiceNo}
        onLookupOne={handleLookupOne}
        listLoading={loading}
        packingDraftByInvoice={packingDraftByInvoice}
        onOpenPackingPicker={openPackingPicker}
      />

      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="mt-3 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
        >
          {t('sweetTracker.cacheList.loadMore')}
        </button>
      )}

      <SweetTrackerPackingListPickerModal
        isOpen={pickerInvoiceNo !== null}
        initialCodes={pickerInitialCodes}
        onClose={closePackingPicker}
        onApply={applyPackingPickerSelection}
      />
    </section>
  );
}
