import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getApiBaseUrl } from '../../api/baseUrl';
import {
  getPackingListsPaginated,
  type PackingListItemWithDetails,
  type PackingListWithItems,
} from '../../api/packingListApi';
import { parsePackingListCodesInput } from '../../api/sweetTrackerApi';
import { packingListRowToken } from '../../utils/packingListLinkToken';

function resolveProductImageUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  if (url.startsWith('http')) return url;
  const base = getApiBaseUrl();
  const origin = base.replace(/\/api\/?$/, '');
  return `${origin}${url.startsWith('/') ? url : `/${url}`}`;
}

function sumPackingListQtyAndBoxes(items: PackingListItemWithDetails[]) {
  const totalQty = items.reduce((s, it) => s + (Number(it.total_quantity) || 0), 0);
  const totalBoxes = items.reduce((s, it) => s + (Number(it.box_count) || 0), 0);
  return { totalQty, totalBoxes };
}

const PAGE_SIZE = 40;
const SEARCH_DEBOUNCE_MS = 350;

export interface SweetTrackerPackingListPickerModalProps {
  isOpen: boolean;
  initialCodes: string[];
  onClose: () => void;
  /** 선택한 패킹리스트 `code` 배열 (0개 이상) */
  onApply: (codes: string[]) => void | Promise<void>;
}

export function SweetTrackerPackingListPickerModal({
  isOpen,
  initialCodes,
  onClose,
  onApply,
}: SweetTrackerPackingListPickerModalProps) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<PackingListWithItems[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [manualExtra, setManualExtra] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const id = window.setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [query, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setPage(1);
  }, [debouncedQuery, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSelectedCodes([...initialCodes]);
      setManualExtra('');
      setQuery('');
      setDebouncedQuery('');
      setPage(1);
      setListError(null);
      setApplyError(null);
    }
  }, [isOpen, initialCodes]);

  const loadPage = useCallback(async () => {
    if (!isOpen) return;
    setListLoading(true);
    setListError(null);
    try {
      const { data, pagination } = await getPackingListsPaginated({
        page,
        limit: PAGE_SIZE,
        search: debouncedQuery || undefined,
      });
      setRows(data);
      setTotalPages(Math.max(1, pagination.totalPages || 1));
    } catch (e) {
      setRows([]);
      setListError(e instanceof Error ? e.message : String(e));
    } finally {
      setListLoading(false);
    }
  }, [isOpen, page, debouncedQuery]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const toggleRowSelection = (pl: PackingListWithItems) => {
    const token = packingListRowToken(pl);
    if (!token) return;
    setSelectedCodes((prev) => (prev.includes(token) ? prev.filter((x) => x !== token) : [...prev, token]));
  };

  const toggleChip = (token: string) => {
    const t = token.trim();
    if (!t) return;
    setSelectedCodes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  function mergeTokensFromPickerAndManual(picker: string[], manualRaw: string): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of picker) {
      const v = s.trim();
      if (!v || seen.has(v)) continue;
      seen.add(v);
      out.push(v);
    }
    for (const v of parsePackingListCodesInput(manualRaw)) {
      const x = v.trim();
      if (!x || seen.has(x)) continue;
      seen.add(x);
      out.push(x);
    }
    return out;
  }

  const handleApply = async () => {
    setApplying(true);
    setApplyError(null);
    try {
      await onApply(mergeTokensFromPickerAndManual(selectedCodes, manualExtra));
      onClose();
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : String(e));
    } finally {
      setApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sweet-tracker-packing-picker-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 id="sweet-tracker-packing-picker-title" className="text-lg font-semibold text-gray-900">
            {t('sweetTracker.cacheList.packingPickerTitle')}
          </h2>
          <p className="mt-1 text-xs text-gray-500">{t('sweetTracker.cacheList.packingPickerHint')}</p>
        </div>

        <div className="border-b border-gray-100 px-4 py-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('sweetTracker.cacheList.packingPickerSearchPlaceholder')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="border-b border-gray-100 px-4 py-2">
          <label className="block text-xs font-medium text-gray-600">
            {t('sweetTracker.cacheList.packingPickerManualLabel')}
          </label>
          <textarea
            value={manualExtra}
            onChange={(e) => setManualExtra(e.target.value)}
            rows={2}
            placeholder={t('sweetTracker.cacheList.packingPickerManualPlaceholder')}
            className="mt-1 w-full resize-y rounded-md border border-gray-300 px-3 py-2 font-mono text-xs text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        {selectedCodes.length > 0 && (
          <div className="max-h-24 overflow-y-auto border-b border-gray-100 bg-gray-50 px-4 py-2">
            <p className="text-xs font-medium text-gray-600">
              {t('sweetTracker.cacheList.packingPickerSelected').replace('{n}', String(selectedCodes.length))}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {selectedCodes.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleChip(c)}
                  className="rounded border border-gray-300 bg-white px-2 py-0.5 font-mono text-xs text-gray-800 hover:bg-gray-100"
                  title={t('sweetTracker.cacheList.packingPickerRemoveChip')}
                >
                  {c} ×
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="min-h-[12rem] flex-1 overflow-y-auto px-2 py-2">
          {(listError || applyError) && (
            <p className="px-2 py-2 text-sm text-red-600" role="alert">
              {applyError || listError}
            </p>
          )}
          {listLoading && !listError && (
            <p className="px-2 py-6 text-center text-sm text-gray-500">{t('sweetTracker.cacheList.packingPickerLoading')}</p>
          )}
          {!listLoading && !listError && rows.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-gray-500">{t('sweetTracker.cacheList.packingPickerEmpty')}</p>
          )}
          {!listLoading && rows.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-[1] bg-gray-50 text-xs font-medium text-gray-600">
                <tr>
                  <th className="w-10 px-2 py-2"> </th>
                  <th className="min-w-[18rem] px-2 py-2">{t('sweetTracker.cacheList.packingPickerColItems')}</th>
                  <th className="whitespace-nowrap px-2 py-2">{t('sweetTracker.cacheList.packingPickerColCode')}</th>
                  <th className="px-2 py-2">{t('sweetTracker.cacheList.packingPickerColDate')}</th>
                  <th className="max-w-[8rem] px-2 py-2">{t('sweetTracker.cacheList.packingPickerColLogistics')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((pl) => {
                  const rowToken = packingListRowToken(pl);
                  const checked = selectedCodes.includes(rowToken);
                  const lineItems = pl.items ?? [];
                  const { totalQty, totalBoxes } = sumPackingListQtyAndBoxes(lineItems);
                  return (
                    <tr key={pl.id} className={checked ? 'bg-purple-50/60' : 'hover:bg-gray-50'}>
                      <td className="px-2 py-2 align-top pt-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRowSelection(pl)}
                          className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          aria-label={`${pl.code} ${pl.shipment_date ?? ''}`}
                        />
                      </td>
                      <td className="min-w-[18rem] px-2 py-2 align-top">
                        {lineItems.length === 0 ? (
                          <p className="text-xs text-gray-400">{t('sweetTracker.cacheList.packingPickerNoLineItems')}</p>
                        ) : (
                          <div className="flex max-h-60 flex-col gap-2">
                            <ul className="min-h-0 max-h-48 space-y-1.5 overflow-y-auto pr-1">
                              {lineItems.map((it, idx) => {
                                const img = resolveProductImageUrl(it.product_image_url);
                                const qty = Number(it.total_quantity) || 0;
                                const boxes = Number(it.box_count) || 0;
                                const unit = it.unit ?? '';
                                return (
                                  <li
                                    key={it.id ?? `line-${pl.id}-${idx}`}
                                    className="flex gap-2 rounded-md border border-gray-100 bg-white/90 p-1.5"
                                  >
                                    <div className="shrink-0">
                                      {img ? (
                                        <img
                                          src={img}
                                          alt=""
                                          className="h-12 w-12 rounded border border-gray-200 object-cover"
                                        />
                                      ) : (
                                        <div
                                          className="flex h-12 w-12 items-center justify-center rounded border border-dashed border-gray-200 bg-gray-50 text-[10px] text-gray-400"
                                          aria-hidden
                                        >
                                          —
                                        </div>
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-medium text-gray-900" title={it.product_name}>
                                        {it.product_name || '—'}
                                      </p>
                                      <p className="mt-0.5 text-[11px] text-gray-600">
                                        {t('sweetTracker.cacheList.packingPickerItemQtyDetail')
                                          .replace('{qty}', String(qty))
                                          .replace('{boxes}', String(boxes))
                                          .replace('{unit}', unit)}
                                      </p>
                                      {it.entry_quantity?.trim() ? (
                                        <p className="mt-0.5 text-[10px] text-gray-400">
                                          {t('sweetTracker.cacheList.packingPickerEntryQty').replace(
                                            '{v}',
                                            it.entry_quantity.trim()
                                          )}
                                        </p>
                                      ) : null}
                                      {it.purchase_order_id?.trim() ? (
                                        <p className="mt-0.5 text-[10px] text-gray-400">
                                          PO {it.purchase_order_id.trim()}
                                        </p>
                                      ) : null}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                            <p className="shrink-0 border-t border-gray-100 pt-1.5 text-[11px] font-medium text-gray-500">
                              {t('sweetTracker.cacheList.packingPickerTotalsLine')
                                .replace('{qty}', String(totalQty))
                                .replace('{boxes}', String(totalBoxes))}
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 align-top pt-3 font-mono text-sm text-gray-900">
                        <button
                          type="button"
                          onClick={() => toggleRowSelection(pl)}
                          className="rounded px-0.5 text-left hover:bg-purple-100/80 hover:underline focus:outline-none focus:ring-2 focus:ring-purple-400"
                        >
                          {pl.code}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 align-top pt-3 text-gray-700">
                        {pl.shipment_date || '—'}
                      </td>
                      <td
                        className="max-w-[8rem] truncate px-2 py-2 align-top pt-3 text-gray-600"
                        title={pl.logistics_company ?? ''}
                      >
                        {pl.logistics_company || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 border-t border-gray-100 px-4 py-2">
            <button
              type="button"
              disabled={page <= 1 || listLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-40"
            >
              {t('sweetTracker.cacheList.packingPickerPrev')}
            </button>
            <span className="text-xs text-gray-600">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || listLoading}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-40"
            >
              {t('sweetTracker.cacheList.packingPickerNext')}
            </button>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={applying}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 disabled:opacity-50"
          >
            {t('sweetTracker.cacheList.packingPickerCancel')}
          </button>
          <button
            type="button"
            onClick={() => void handleApply()}
            disabled={applying || listLoading}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {applying ? t('sweetTracker.cacheList.packingPickerApplying') : t('sweetTracker.cacheList.packingPickerApply')}
          </button>
        </div>
      </div>
    </div>
  );
}
