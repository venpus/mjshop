import type { SweetTrackerBulkResultRow } from './sweetTrackerBulkRows';

export interface SweetTrackerBulkResultTableProps {
  rows: SweetTrackerBulkResultRow[];
  labelCategory: string;
  labelInvoice: string;
  labelLastStatus: string;
  labelLastWhere: string;
  labelLastTime: string;
  labelAction?: string;
  lookupLabel: string;
  lookupLoadingLabel: string;
  busyInvoiceNo: string | null;
  /** 미완료(not_complete) 행만 개별 재조회 */
  onLookupNotComplete?: (invoiceNo: string) => void | Promise<void>;
  statusLabel: (kind: SweetTrackerBulkResultRow['kind']) => string;
}

export function SweetTrackerBulkResultTable({
  rows,
  labelCategory,
  labelInvoice,
  labelLastStatus,
  labelLastWhere,
  labelLastTime,
  labelAction = '',
  lookupLabel,
  lookupLoadingLabel,
  busyInvoiceNo,
  onLookupNotComplete,
  statusLabel,
}: SweetTrackerBulkResultTableProps) {
  if (rows.length === 0) return null;

  const showAction = Boolean(onLookupNotComplete);

  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-gray-700">{labelCategory}</th>
            <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-gray-700">{labelInvoice}</th>
            <th className="px-3 py-2 text-left font-medium text-gray-700">{labelLastStatus}</th>
            <th className="px-3 py-2 text-left font-medium text-gray-700">{labelLastWhere}</th>
            <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-gray-700">{labelLastTime}</th>
            {showAction && (
              <th className="w-24 whitespace-nowrap px-3 py-2 text-right font-medium text-gray-700">
                {labelAction}
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((r) => {
            const status = statusLabel(r.kind);
            const statusClass =
              r.kind === 'completed'
                ? 'text-green-800 bg-green-50'
                : r.kind === 'not_complete'
                  ? 'text-amber-900 bg-amber-50'
                  : 'text-red-800 bg-red-50';
            const busy = busyInvoiceNo === r.invoiceNo;
            return (
              <tr key={`${r.kind}-${r.invoiceNo}`}>
                <td className="whitespace-nowrap px-3 py-2">
                  <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${statusClass}`}>{status}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-gray-900">{r.invoiceNo}</td>
                <td className="max-w-[14rem] truncate px-3 py-2 text-gray-800" title={r.lastKind}>
                  {r.lastKind || '—'}
                </td>
                <td className="max-w-[14rem] truncate px-3 py-2 text-gray-700" title={r.lastWhere}>
                  {r.lastWhere || '—'}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-gray-600">{r.lastTimeString || '—'}</td>
                {showAction && (
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {r.kind === 'not_complete' && onLookupNotComplete ? (
                      <button
                        type="button"
                        onClick={() => void onLookupNotComplete(r.invoiceNo)}
                        disabled={busy}
                        className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {busy ? lookupLoadingLabel : lookupLabel}
                      </button>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
