import React, { useState, useCallback } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  fetchPaymentMiscEntries,
  createPaymentMiscEntry,
  updatePaymentMiscEntry,
  deletePaymentMiscEntry,
  uploadPaymentMiscFile,
  removePaymentMiscFile,
  type PaymentMiscEntry,
} from '../../api/paymentMiscEntriesApi';
import { PaymentMiscAmountRow } from './PaymentMiscAmountRow';

export interface PaymentMiscAmountTabProps {
  /** 행 추가·저장·삭제·파일 변경 후 상단 합계 카드 갱신 */
  onEntriesChanged?: () => void;
}

export function PaymentMiscAmountTab({ onEntriesChanged }: PaymentMiscAmountTabProps) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<PaymentMiscEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await fetchPaymentMiscEntries();
      setRows(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('payment.miscLoadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    load();
  }, [load]);

  const labels = {
    date: t('payment.miscColDate'),
    description: t('payment.miscColDesc'),
    amount: t('payment.miscColAmount'),
    completed: t('payment.miscColDone'),
    file: t('payment.miscFileUpload'),
    delete: t('payment.miscDelete'),
    yuan: t('payment.miscYuan'),
  };

  const handlePatch = async (id: number, body: Partial<PaymentMiscEntry>) => {
    const updated = await updatePaymentMiscEntry(id, {
      entry_date: body.entry_date,
      description: body.description,
      amount_cny: body.amount_cny,
      is_completed: body.is_completed,
    });
    setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
    onEntriesChanged?.();
    return updated;
  };

  const handleDelete = async (id: number) => {
    await deletePaymentMiscEntry(id);
    setRows((prev) => prev.filter((r) => r.id !== id));
    onEntriesChanged?.();
  };

  const handleUpload = async (id: number, file: File) => {
    const updated = await uploadPaymentMiscFile(id, file);
    setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
    onEntriesChanged?.();
    return updated;
  };

  const handleRemoveFile = async (id: number) => {
    const updated = await removePaymentMiscFile(id);
    setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
    onEntriesChanged?.();
    return updated;
  };

  const handleAdd = async () => {
    setAdding(true);
    setError(null);
    try {
      const row = await createPaymentMiscEntry({});
      setRows((prev) => [row, ...prev]);
      onEntriesChanged?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('payment.miscAddError'));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">{t('payment.miscIntro')}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {t('payment.miscRefresh')}
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {t('payment.miscAddRow')}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">{error}</div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-2 py-3 font-semibold text-gray-700 whitespace-nowrap">{labels.date}</th>
              <th className="text-left px-2 py-3 font-semibold text-gray-700 whitespace-nowrap min-w-[12rem]">
                {labels.description}
              </th>
              <th className="text-left px-2 py-3 font-semibold text-gray-700 whitespace-nowrap">
                {labels.amount} ({labels.yuan})
              </th>
              <th className="text-center px-2 py-3 font-semibold text-gray-700 whitespace-nowrap w-24">
                {labels.completed}
              </th>
              <th className="text-left px-2 py-3 font-semibold text-gray-700 whitespace-nowrap min-w-[11rem]">
                {labels.file}
              </th>
              <th className="w-12 px-2 py-3" aria-label={labels.delete} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                  {t('payment.loading')}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                  {t('payment.miscEmpty')}
                </td>
              </tr>
            ) : (
              rows.map((entry) => (
                <PaymentMiscAmountRow
                  key={entry.id}
                  entry={entry}
                  labels={labels}
                  onPatch={handlePatch}
                  onDelete={handleDelete}
                  onUploadFile={handleUpload}
                  onRemoveFile={handleRemoveFile}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
