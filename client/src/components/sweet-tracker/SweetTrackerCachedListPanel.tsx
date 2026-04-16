import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  getSweetTrackerCachedInvoices,
  parsePackingListCodesInput,
  patchSweetTrackerInvoicePackingListCodes,
  postSweetTrackerBulkDeliveryCompleted,
  postSweetTrackerRefreshAllNotCompleteCached,
  type SweetTrackerCachedInvoiceItem,
} from '../../api/sweetTrackerApi';
import { SweetTrackerCachedInvoicesTable } from './SweetTrackerCachedInvoicesTable';
import { SweetTrackerPackingListPickerModal } from './SweetTrackerPackingListPickerModal';

const PAGE_LIMIT = 50;
const MAX_PACKING_LIST_CODES = 40;
/** 서버 `postBulkDeliveryCompleted`와 동일 상한 */
const BULK_INVOICE_LOOKUP_CHUNK = 150;

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
  const [page, setPage] = useState(1);
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'complete' | 'not_complete'>('all');
  const [invoiceSearchText, setInvoiceSearchText] = useState('');
  const [invoiceSearchApplied, setInvoiceSearchApplied] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyInvoiceNo, setBusyInvoiceNo] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [refreshAllNotCompleteBusy, setRefreshAllNotCompleteBusy] = useState(false);
  const [bulkSelectedRefreshBusy, setBulkSelectedRefreshBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [packingDraftByInvoice, setPackingDraftByInvoice] = useState<Record<string, string>>({});
  const [pickerInvoiceNo, setPickerInvoiceNo] = useState<string | null>(null);
  const [pickerInitialCodes, setPickerInitialCodes] = useState<string[]>([]);
  const [bulkPickerOpen, setBulkPickerOpen] = useState(false);

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const latestPackingTextRef = useRef<Record<string, string>>({});
  const packingDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const packingSaveGenRef = useRef<Record<string, number>>({});

  const load = useCallback(
    async (fromOffset: number) => {
      setError(null);
      setLoading(true);
      try {
        const json = await getSweetTrackerCachedInvoices(user?.id, {
          limit: PAGE_LIMIT,
          offset: fromOffset,
          deliveryComplete: deliveryFilter,
          invoiceNoQuery: invoiceSearchApplied,
        });
        setTotal(json.data.total);
        setItems(json.data.items);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setItems([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [user?.id, deliveryFilter, invoiceSearchApplied]
  );

  useEffect(() => {
    setPage(1);
    void load(0);
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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT) || 1);

  useEffect(() => {
    const nextOffset = (page - 1) * PAGE_LIMIT;
    void load(nextOffset);
  }, [page, load]);

  useEffect(() => {
    setPage(1);
    void load(0);
  }, [deliveryFilter, load]);

  useEffect(() => {
    setPage(1);
    void load(0);
  }, [invoiceSearchApplied, load]);

  const applyInvoiceSearch = useCallback(() => {
    const next = invoiceSearchText.trim();
    setInvoiceSearchApplied(next);
    setBulkSelected(new Set());
  }, [invoiceSearchText]);

  const handleRefreshAllNotComplete = async () => {
    if (!window.confirm(t('sweetTracker.cacheList.refreshAllNotCompleteConfirm'))) return;
    setRefreshAllNotCompleteBusy(true);
    setError(null);
    setNotice(null);
    try {
      const json = await postSweetTrackerRefreshAllNotCompleteCached(user?.id);
      const errN = json.data.errors.length;
      setNotice(
        t('sweetTracker.cacheList.refreshAllNotCompleteDone')
          .replace('{requested}', String(json.meta.requested))
          .replace('{fromApi}', String(json.meta.from_api))
          .replace('{fromCache}', String(json.meta.from_cache))
          .replace('{errors}', String(errN))
      );
      await load((page - 1) * PAGE_LIMIT);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshAllNotCompleteBusy(false);
    }
  };

  const handleLookupOne = async (invoiceNo: string) => {
    setBusyInvoiceNo(invoiceNo);
    setError(null);
    try {
      await postSweetTrackerBulkDeliveryCompleted(user?.id, [invoiceNo]);
      await load((page - 1) * PAGE_LIMIT);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyInvoiceNo(null);
    }
  };

  const toggleBulkSelect = useCallback((invoiceNo: string) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(invoiceNo)) next.delete(invoiceNo);
      else next.add(invoiceNo);
      return next;
    });
  }, []);

  const toggleBulkSelectAllVisible = useCallback((checked: boolean, invoiceNos: string[]) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (checked) {
        for (const no of invoiceNos) next.add(no);
      } else {
        for (const no of invoiceNos) next.delete(no);
      }
      return next;
    });
  }, []);

  const clearBulkSelection = useCallback(() => setBulkSelected(new Set()), []);

  const handleBulkRefreshSelected = useCallback(async () => {
    if (bulkSelected.size === 0) return;
    const invoiceNos = Array.from(bulkSelected);
    if (
      !window.confirm(
        t('sweetTracker.cacheList.bulkRefreshSelectedConfirm').replace('{n}', String(invoiceNos.length))
      )
    ) {
      return;
    }
    setBulkSelectedRefreshBusy(true);
    setError(null);
    setNotice(null);
    try {
      let totalRequested = 0;
      let totalFromApi = 0;
      let totalFromCache = 0;
      let totalErrors = 0;
      for (let i = 0; i < invoiceNos.length; i += BULK_INVOICE_LOOKUP_CHUNK) {
        const slice = invoiceNos.slice(i, i + BULK_INVOICE_LOOKUP_CHUNK);
        const json = await postSweetTrackerBulkDeliveryCompleted(user?.id, slice);
        totalRequested += json.meta.requested;
        totalFromApi += json.meta.from_api;
        totalFromCache += json.meta.from_cache;
        totalErrors += json.data.errors.length;
      }
      setNotice(
        t('sweetTracker.cacheList.bulkRefreshSelectedDone')
          .replace('{requested}', String(totalRequested))
          .replace('{fromApi}', String(totalFromApi))
          .replace('{fromCache}', String(totalFromCache))
          .replace('{errors}', String(totalErrors))
      );
      await load((page - 1) * PAGE_LIMIT);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBulkSelectedRefreshBusy(false);
    }
  }, [bulkSelected, user?.id, t, load, page]);

  const openBulkPackingPicker = useCallback(() => {
    setBulkPickerOpen(true);
  }, []);

  const applyBulkPackingCodes = useCallback(
    async (codes: string[]) => {
      if (bulkSelected.size === 0) return;
      const invoiceNos = Array.from(bulkSelected);
      setBulkBusy(true);
      setError(null);
      try {
        const CHUNK = 10;
        for (let i = 0; i < invoiceNos.length; i += CHUNK) {
          const slice = invoiceNos.slice(i, i + CHUNK);
          await Promise.all(slice.map((inv) => patchSweetTrackerInvoicePackingListCodes(user?.id, inv, codes)));
        }
        await load((page - 1) * PAGE_LIMIT);
        clearBulkSelection();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBulkBusy(false);
      }
    },
    [bulkSelected, user?.id, load, clearBulkSelection, page]
  );

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

  const panelBlocking = loading || bulkBusy || refreshAllNotCompleteBusy || bulkSelectedRefreshBusy;

  return (
    <section className="mt-10 border-t border-gray-200 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('sweetTracker.cacheList.title')}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1">
            <input
              type="search"
              value={invoiceSearchText}
              onChange={(e) => setInvoiceSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyInvoiceSearch();
              }}
              placeholder={t('sweetTracker.cacheList.searchPlaceholder')}
              disabled={panelBlocking}
              className="w-56 rounded-md border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={applyInvoiceSearch}
              disabled={panelBlocking}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
            >
              {t('sweetTracker.cacheList.searchButton')}
            </button>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setDeliveryFilter('all')}
              disabled={panelBlocking}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                deliveryFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t('sweetTracker.cacheList.filterAll')}
            </button>
            <button
              type="button"
              onClick={() => setDeliveryFilter('not_complete')}
              disabled={panelBlocking}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                deliveryFilter === 'not_complete' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t('sweetTracker.cacheList.filterNotComplete')}
            </button>
            <button
              type="button"
              onClick={() => setDeliveryFilter('complete')}
              disabled={panelBlocking}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                deliveryFilter === 'complete' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t('sweetTracker.cacheList.filterComplete')}
            </button>
          </div>
          {deliveryFilter === 'not_complete' && (
            <button
              type="button"
              onClick={() => void handleRefreshAllNotComplete()}
              disabled={panelBlocking}
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-50"
            >
              {refreshAllNotCompleteBusy
                ? t('sweetTracker.cacheList.refreshAllNotCompleteBusy')
                : t('sweetTracker.cacheList.refreshAllNotComplete')}
            </button>
          )}
          {bulkSelected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5">
              <span className="text-sm font-medium text-purple-900">
                {t('sweetTracker.cacheList.bulkSelected').replace('{n}', String(bulkSelected.size))}
              </span>
              <button
                type="button"
                onClick={() => void handleBulkRefreshSelected()}
                disabled={panelBlocking}
                className="rounded-md border border-amber-400 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-50"
              >
                {bulkSelectedRefreshBusy
                  ? t('sweetTracker.cacheList.bulkRefreshSelectedBusy')
                  : t('sweetTracker.cacheList.bulkRefreshSelected')}
              </button>
              <button
                type="button"
                onClick={openBulkPackingPicker}
                disabled={panelBlocking}
                className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {bulkBusy ? t('sweetTracker.cacheList.bulkApplying') : t('sweetTracker.cacheList.bulkApplyOpen')}
              </button>
              <button
                type="button"
                onClick={clearBulkSelection}
                disabled={panelBlocking}
                className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
              >
                {t('sweetTracker.cacheList.bulkClear')}
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => void load((page - 1) * PAGE_LIMIT)}
            disabled={panelBlocking}
            className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? t('sweetTracker.cacheList.loading') : t('sweetTracker.cacheList.refresh')}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {notice && (
        <p className="mt-3 text-sm text-emerald-800" role="status">
          {notice}
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
        listLoading={panelBlocking}
        packingDraftByInvoice={packingDraftByInvoice}
        onOpenPackingPicker={openPackingPicker}
        enableSelection
        selectedInvoiceNos={bulkSelected}
        onToggleSelect={toggleBulkSelect}
        onToggleSelectAll={toggleBulkSelectAllVisible}
      />

      {totalPages > 1 && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || panelBlocking}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-40"
          >
            {t('sweetTracker.cacheList.pagePrev')}
          </button>
          <span className="text-sm text-gray-600">
            {t('sweetTracker.cacheList.pageLabel')
              .replace('{page}', String(page))
              .replace('{totalPages}', String(totalPages))}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || panelBlocking}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-40"
          >
            {t('sweetTracker.cacheList.pageNext')}
          </button>
        </div>
      )}

      <SweetTrackerPackingListPickerModal
        isOpen={pickerInvoiceNo !== null}
        initialCodes={pickerInitialCodes}
        onClose={closePackingPicker}
        onApply={applyPackingPickerSelection}
      />

      <SweetTrackerPackingListPickerModal
        isOpen={bulkPickerOpen}
        initialCodes={[]}
        onClose={() => setBulkPickerOpen(false)}
        onApply={applyBulkPackingCodes}
      />
    </section>
  );
}
