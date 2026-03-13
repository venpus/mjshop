import { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { postAiWorkSummary } from '../../../api/productCollabApi';
import type { AiWorkSummaryResult } from '../../../api/productCollabApi';
import { OverallSummaryTable } from './OverallSummaryTable';
import { MyTasksSummaryTable } from './MyTasksSummaryTable';

export function AiWorkSummarySection() {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AiWorkSummaryResult | null>(null);

  const lang = language === 'zh' ? 'zh' : 'ko';

  const handleSummarize = async () => {
    setLoading(true);
    setError(null);
    const res = await postAiWorkSummary(lang);
    setLoading(false);
    if (res.success && res.data) {
      setData(res.data);
    } else {
      setError(res.error ?? t('productCollab.summaryError'));
    }
  };

  const showResult = data !== null;

  return (
    <section className="rounded-xl border-2 border-[#E5E7EB] bg-white overflow-hidden mb-6">
      <div className="px-4 py-3 bg-[#F3F4F6] border-b border-[#E5E7EB] flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-semibold text-[#374151]">{t('productCollab.aiWorkAssistant')}</h2>
        <button
          type="button"
          disabled={loading}
          onClick={handleSummarize}
          className="px-4 py-2 text-sm font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t('productCollab.loading') : t('productCollab.summarize')}
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
                {t('productCollab.overallSummaryTitle')}
              </h3>
              {data.overallSummary.length > 0 ? (
                <OverallSummaryTable products={data.overallSummary} />
              ) : (
                <p className="text-[#6B7280] text-sm">{t('productCollab.summaryEmpty')}</p>
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#374151] mb-2">
                {t('productCollab.myTasksSummaryTitle')}
              </h3>
              {data.myTasksSummary.length > 0 ? (
                <MyTasksSummaryTable items={data.myTasksSummary} />
              ) : (
                <p className="text-[#6B7280] text-sm">{t('productCollab.summaryEmpty')}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
