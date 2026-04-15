import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  parseBulkInvoiceInput,
  postSweetTrackerBulkDeliveryCompleted,
  type SweetTrackerBulkDeliveryCompletedData,
} from '../../api/sweetTrackerApi';
import { buildSweetTrackerBulkResultRows } from './sweetTrackerBulkRows';
import { mergeBulkResultForInvoices } from './sweetTrackerBulkMerge';
import { SweetTrackerBulkResultTable } from './SweetTrackerBulkResultTable';

export interface SweetTrackerBulkPanelProps {
  /** 대량 조회가 성공적으로 끝난 뒤 호출 (DB 캐시 목록 갱신 등). */
  onBulkSuccess?: () => void;
}

export function SweetTrackerBulkPanel({ onBulkSuccess }: SweetTrackerBulkPanelProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [rawInput, setRawInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultData, setResultData] = useState<SweetTrackerBulkDeliveryCompletedData | null>(null);
  const [summary, setSummary] = useState<{
    requested: number;
    completed: number;
    notComplete: number;
    errors: number;
    from_cache: number;
    from_api: number;
  } | null>(null);
  const [busyInvoiceNo, setBusyInvoiceNo] = useState<string | null>(null);
  const resultDataRef = useRef<SweetTrackerBulkDeliveryCompletedData | null>(null);
  useEffect(() => {
    resultDataRef.current = resultData;
  }, [resultData]);

  const displayRows = useMemo(
    () => (resultData ? buildSweetTrackerBulkResultRows(resultData) : []),
    [resultData]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const invoices = parseBulkInvoiceInput(rawInput);
    if (invoices.length === 0) {
      setError(t('sweetTracker.bulk.emptyInput'));
      setResultData(null);
      setSummary(null);
      return;
    }
    setLoading(true);
    try {
      const json = await postSweetTrackerBulkDeliveryCompleted(user?.id, invoices);
      setResultData(json.data);
      setSummary({
        requested: json.meta.requested,
        completed: json.data.completed.length,
        notComplete: json.data.notComplete.length,
        errors: json.data.errors.length,
        from_cache: json.meta.from_cache,
        from_api: json.meta.from_api,
      });
      onBulkSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setResultData(null);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSingleLookup = async (invoiceNo: string) => {
    setBusyInvoiceNo(invoiceNo);
    setError(null);
    try {
      const json = await postSweetTrackerBulkDeliveryCompleted(user?.id, [invoiceNo]);
      const prev = resultDataRef.current;
      const next = !prev ? json.data : mergeBulkResultForInvoices(prev, [invoiceNo], json.data);
      resultDataRef.current = next;
      setResultData(next);
      setSummary((s) => {
        if (!s) return s;
        return {
          ...s,
          completed: next.completed.length,
          notComplete: next.notComplete.length,
          errors: next.errors.length,
        };
      });
      onBulkSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyInvoiceNo(null);
    }
  };

  return (
    <section className="mt-4">
      <h2 className="text-lg font-semibold text-gray-900">{t('sweetTracker.bulk.title')}</h2>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('sweetTracker.bulk.textareaLabel')}</label>
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            rows={8}
            placeholder={t('sweetTracker.bulk.textareaPlaceholder')}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? t('sweetTracker.bulk.loading') : t('sweetTracker.bulk.submit')}
        </button>
      </form>

      {summary && (
        <div className="mt-4 space-y-1">
          <p className="text-sm text-gray-700">
            {t('sweetTracker.bulk.summary')
              .replace('{requested}', String(summary.requested))
              .replace('{completed}', String(summary.completed))
              .replace('{notComplete}', String(summary.notComplete))
              .replace('{errors}', String(summary.errors))}
          </p>
          <p className="text-xs text-gray-500">
            {t('sweetTracker.bulk.cacheHint')
              .replace('{from_cache}', String(summary.from_cache))
              .replace('{from_api}', String(summary.from_api))}
          </p>
        </div>
      )}

      <SweetTrackerBulkResultTable
        rows={displayRows}
        labelCategory={t('sweetTracker.bulk.colCategory')}
        labelInvoice={t('sweetTracker.bulk.colInvoice')}
        labelLastStatus={t('sweetTracker.bulk.colLastStatus')}
        labelLastWhere={t('sweetTracker.bulk.colLastWhere')}
        labelLastTime={t('sweetTracker.bulk.colLastTime')}
        labelAction={t('sweetTracker.bulk.colAction')}
        lookupLabel={t('sweetTracker.bulk.lookup')}
        lookupLoadingLabel={t('sweetTracker.bulk.lookupLoading')}
        busyInvoiceNo={busyInvoiceNo}
        onLookupNotComplete={handleSingleLookup}
        statusLabel={(kind) => t(`sweetTracker.bulk.status.${kind}`)}
      />
    </section>
  );
}
