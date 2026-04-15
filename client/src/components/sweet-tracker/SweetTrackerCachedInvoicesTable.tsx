import type { SweetTrackerCachedInvoiceItem } from '../../api/sweetTrackerApi';
import { parsePackingListCodesInput } from '../../api/sweetTrackerApi';

export interface SweetTrackerCachedInvoicesTableProps {
  t: (key: string) => string;
  items: SweetTrackerCachedInvoiceItem[];
  busyInvoiceNo: string | null;
  onLookupOne: (invoiceNo: string) => void;
  /** 전체 목록 로딩 시 조회 버튼 등 비활성화 */
  listLoading?: boolean;
  packingDraftByInvoice: Record<string, string>;
  onOpenPackingPicker: (invoiceNo: string) => void;
  /** 선택 기능 (대량 적용 등) */
  enableSelection?: boolean;
  selectedInvoiceNos?: Set<string>;
  onToggleSelect?: (invoiceNo: string) => void;
  onToggleSelectAll?: (checked: boolean, invoiceNos: string[]) => void;
  /** 테이블 바깥 래퍼 class (기본: 택배 조회 패널과 동일) */
  wrapperClassName?: string;
}

export function SweetTrackerCachedInvoicesTable({
  t,
  items,
  busyInvoiceNo,
  onLookupOne,
  listLoading = false,
  packingDraftByInvoice,
  onOpenPackingPicker,
  enableSelection = false,
  selectedInvoiceNos,
  onToggleSelect,
  onToggleSelectAll,
  wrapperClassName = 'mt-3 overflow-x-auto rounded-lg border border-gray-200',
}: SweetTrackerCachedInvoicesTableProps) {
  if (items.length === 0) return null;

  const invoiceNos = items.map((x) => x.invoiceNo);
  const selectionActive = enableSelection && selectedInvoiceNos && onToggleSelect;
  const allSelected =
    selectionActive && invoiceNos.length > 0 ? invoiceNos.every((no) => selectedInvoiceNos.has(no)) : false;
  const someSelected =
    selectionActive && invoiceNos.length > 0 ? invoiceNos.some((no) => selectedInvoiceNos.has(no)) : false;

  const openPackingListInNewTab = (token: string) => {
    const raw = token.trim();
    if (!raw) return;
    const codeOnly = raw.split('::')[0]!.trim();
    if (!codeOnly) return;
    const params = new URLSearchParams();
    params.set('search', codeOnly);
    window.open(`/admin/shipping-history?${params.toString()}`, '_blank');
  };

  return (
    <div className={wrapperClassName}>
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {selectionActive && (
              <th className="w-10 px-3 py-2 text-left font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (!el) return;
                    el.indeterminate = !allSelected && someSelected;
                  }}
                  onChange={(e) => onToggleSelectAll?.(e.target.checked, invoiceNos)}
                  disabled={listLoading}
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  aria-label={t('sweetTracker.cacheList.colSelect')}
                />
              </th>
            )}
            <th className="px-3 py-2 text-left font-medium text-gray-700">{t('sweetTracker.cacheList.colInvoice')}</th>
            <th className="min-w-[12rem] px-3 py-2 text-left font-medium text-gray-700">
              {t('sweetTracker.cacheList.colPackingListCodes')}
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-700">{t('sweetTracker.cacheList.colComplete')}</th>
            <th className="px-3 py-2 text-left font-medium text-gray-700">{t('sweetTracker.cacheList.colLastStatus')}</th>
            <th className="px-3 py-2 text-left font-medium text-gray-700">{t('sweetTracker.cacheList.colLastTime')}</th>
            <th className="w-24 px-3 py-2 text-right font-medium text-gray-700">{t('sweetTracker.cacheList.colAction')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {items.map((r) => {
            const busy = busyInvoiceNo === r.invoiceNo;
            const displayCodes =
              packingDraftByInvoice[r.invoiceNo] !== undefined
                ? parsePackingListCodesInput(packingDraftByInvoice[r.invoiceNo]!)
                : (r.packingListCodes ?? []);
            return (
              <tr key={r.invoiceNo}>
                {selectionActive && (
                  <td className="whitespace-nowrap px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedInvoiceNos.has(r.invoiceNo)}
                      onChange={() => onToggleSelect(r.invoiceNo)}
                      disabled={listLoading}
                      className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      aria-label={r.invoiceNo}
                    />
                  </td>
                )}
                <td className="whitespace-nowrap px-3 py-2 font-mono text-gray-900">{r.invoiceNo}</td>
                <td className="min-w-[12rem] max-w-[28rem] px-3 py-2 align-middle">
                  <div className="flex min-h-[2rem] flex-wrap items-center gap-1">
                    {displayCodes.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => openPackingListInNewTab(c)}
                        className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-xs text-gray-800"
                        title={c}
                      >
                        {c}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => onOpenPackingPicker(r.invoiceNo)}
                      disabled={listLoading}
                      className="shrink-0 rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {t('sweetTracker.cacheList.packingPickerOpen')}
                    </button>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {r.isDeliveryComplete ? (
                    <span className="rounded bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800">
                      {t('sweetTracker.cacheList.yesComplete')}
                    </span>
                  ) : (
                    <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">
                      {t('sweetTracker.cacheList.noComplete')}
                    </span>
                  )}
                </td>
                <td className="max-w-[20rem] truncate px-3 py-2 text-gray-800" title={`${r.lastKind} ${r.lastWhere}`}>
                  {r.lastKind || '—'}
                  {r.lastWhere ? ` · ${r.lastWhere}` : ''}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-gray-600">{r.lastTimeString || '—'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  {!r.isDeliveryComplete ? (
                    <button
                      type="button"
                      onClick={() => void onLookupOne(r.invoiceNo)}
                      disabled={busy || listLoading}
                      className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {busy ? t('sweetTracker.cacheList.lookupLoading') : t('sweetTracker.cacheList.lookup')}
                    </button>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
