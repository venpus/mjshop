import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../../contexts/LanguageContext';
import { postAiWorkSummary, getAiWorkSummaryLast } from '../../../api/productCollabApi';
import type { AiWorkSummaryResult } from '../../../api/productCollabApi';
import { MyTasksSummaryTable } from './MyTasksSummaryTable';
import { StatusCategorySummaryList } from './StatusCategorySummaryList';

function formatSummaryGeneratedAgo(isoString: string): { key: string; n?: number } {
  const then = new Date(isoString).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return { key: 'productCollab.summaryGeneratedAgoJustNow' };
  if (diffSec < 3600) return { key: 'productCollab.summaryGeneratedAgoMinutes', n: Math.floor(diffSec / 60) };
  if (diffSec < 86400) return { key: 'productCollab.summaryGeneratedAgoHours', n: Math.floor(diffSec / 3600) };
  return { key: 'productCollab.summaryGeneratedAgoDays', n: Math.floor(diffSec / 86400) };
}

export function AiWorkSummarySection() {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AiWorkSummaryResult | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const lang = language === 'zh' ? 'zh' : 'ko';

  useEffect(() => {
    let cancelled = false;
    getAiWorkSummaryLast(lang).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setData(res.data);
        setGeneratedAt(res.data.generatedAt ?? null);
      } else {
        setData(null);
        setGeneratedAt(null);
      }
    });
    return () => { cancelled = true; };
  }, [lang]);

  const handleSummarize = async () => {
    setLoading(true);
    setError(null);
    const res = await postAiWorkSummary(lang);
    setLoading(false);
    if (res.success && res.data) {
      setData(res.data);
      if (res.data.generatedAt) setGeneratedAt(res.data.generatedAt);
    } else {
      setError(res.error ?? t('productCollab.summaryError'));
    }
  };

  const showResult = data !== null;
  const agoText = generatedAt
    ? (() => {
        const { key, n } = formatSummaryGeneratedAgo(generatedAt);
        return n !== undefined ? t(key).replace('{n}', String(n)) : t(key);
      })()
    : null;

  return (
    <section className="rounded-none sm:rounded-xl border-2 border-[#E5E7EB] bg-white overflow-hidden mb-6 -mx-6 sm:mx-0">
      <div className="px-4 py-3 bg-[#F3F4F6] border-b border-[#E5E7EB] flex flex-row items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0 overflow-hidden flex-1">
          <h2 className="text-base sm:text-lg font-semibold text-[#374151] truncate min-w-0">{t('productCollab.aiWorkAssistant')}</h2>
          {agoText && (
            <span className="text-xs sm:text-sm text-[#6B7280] truncate min-w-0">
              ({data?.provider ? `${data.provider === 'openai' ? 'OpenAI' : 'Qwen'} · ${agoText}` : agoText})
            </span>
          )}
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={handleSummarize}
          className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {loading ? t('productCollab.loading') : (<><span className="sm:hidden">{t('productCollab.summary')}</span><span className="hidden sm:inline">{t('productCollab.summarize')}</span></>)}
        </button>
      </div>
      <div className="p-4">
        {error && (
          <p className="text-red-600 text-sm mb-3" role="alert">
            {error}
          </p>
        )}
        {!showResult && !loading && !error && (
          <p className="text-[#6B7280] text-sm mb-3">{t('productCollab.summarizePrompt')}</p>
        )}
        {showResult && data && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-[#374151] mb-2">
                {t('productCollab.myTasksSummaryTitle')}
              </h3>
              {data.myTasksSummary.length > 0 ? (
                <>
                  <div className="rounded-lg border border-[#E5E7EB] overflow-hidden mb-3">
                    {data.myTasksOverallSummary && (
                      <p className="p-3 text-sm text-[#374151] bg-white border-b border-[#E5E7EB]">
                        {data.myTasksOverallSummary}
                      </p>
                    )}
                    <p
                      className={
                        data.myTasksOverallSummary
                          ? 'p-3 pt-0 text-xs text-[#6B7280] bg-white'
                          : 'p-3 text-xs text-[#6B7280] bg-white'
                      }
                    >
                      <span className="mr-1.5">{t('productCollab.relatedProducts')}:</span>
                      {data.myTasksSummary.map((row, idx) => (
                        <span key={row.productId}>
                          {idx > 0 && <span className="text-[#9CA3AF] mx-1">·</span>}
                          <Link
                            to={`/admin/product-collab/thread/${row.productId}?from=summary`}
                            className="text-[#2563EB] hover:underline"
                          >
                            {row.productName}
                          </Link>
                        </span>
                      ))}
                    </p>
                  </div>
                  <MyTasksSummaryTable items={data.myTasksSummary} />
                </>
              ) : (
                <p className="text-[#6B7280] text-sm">{t('productCollab.summaryEmpty')}</p>
              )}
            </div>
            {data.statusCategorySummaries && data.statusCategorySummaries.length > 0 && (
              <div>
                <h3 className="text-base font-semibold text-[#374151] mb-2">
                  {t('productCollab.statusCategorySummaryTitle')}
                </h3>
                <StatusCategorySummaryList
                  items={data.statusCategorySummaries}
                  overallSummary={data.overallSummary}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
