import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
  postAiWorkSummary,
  postAiWorkSummaryTranslate,
  getAiWorkSummaryLast,
  getAiWorkSummaryStatus,
} from '../../../api/productCollabApi';
import type { AiWorkSummaryResult, AiWorkSummaryPhase } from '../../../api/productCollabApi';
import { MyTasksSummaryTable } from './MyTasksSummaryTable';
import { StatusCategorySummaryList } from './StatusCategorySummaryList';

const POLL_LAST_MS = 5000;
const POLL_STATUS_MS = 2000;

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
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AiWorkSummaryResult | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [hasKoSummary, setHasKoSummary] = useState(false);
  const [loadingSummarize, setLoadingSummarize] = useState(false);
  const [loadingTranslate, setLoadingTranslate] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [generatingPhase, setGeneratingPhase] = useState<AiWorkSummaryPhase | null>(null);
  const pollKoLastRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollKoStatusRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollZhLastRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollZhStatusRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 업무 요약 표시 언어: 사이트 설정 언어로 결정. 설정이 중국어면 zh, 그 외면 ko
  const displayLang: 'ko' | 'zh' = language === 'zh' ? 'zh' : 'ko';

  const refetchDisplay = useCallback(() => {
    getAiWorkSummaryLast(displayLang).then((res) => {
      if (res.success && res.data) {
        setData(res.data);
        setGeneratedAt(res.data.generatedAt ?? null);
      } else {
        setData(null);
        setGeneratedAt(null);
      }
    });
  }, [displayLang]);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setGeneratedAt(null);
    getAiWorkSummaryLast(displayLang).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setData(res.data);
        setGeneratedAt(res.data.generatedAt ?? null);
      } else {
        setData(null);
        setGeneratedAt(null);
      }
    });
    getAiWorkSummaryLast('ko').then((res) => {
      if (cancelled) return;
      setHasKoSummary(!!(res.success && res.data));
    });
    getAiWorkSummaryStatus('ko').then((res) => {
      if (cancelled) return;
      if (res.success && res.generating) {
        if (res.phase === 'translating') setIsTranslating(true);
        else setIsSummarizing(true);
        setGeneratingPhase(res.phase ?? 'summarizing');
      }
    });
    getAiWorkSummaryStatus('zh').then((res) => {
      if (cancelled) return;
      if (res.success && res.generating) {
        if (res.phase === 'translating') setIsTranslating(true);
        else setIsSummarizing(true);
        setGeneratingPhase(res.phase ?? 'summarizing');
      }
    });
    return () => { cancelled = true; };
  }, [displayLang]);

  useEffect(() => {
    if (!isSummarizing) return;
    const pollLast = () => {
      getAiWorkSummaryLast(displayLang).then((res) => {
        if (res.success && res.data) {
          if (displayLang === 'ko') setHasKoSummary(true);
          setIsSummarizing(false);
          setGeneratingPhase(null);
          setData(res.data);
          setGeneratedAt(res.data.generatedAt ?? null);
          refetchDisplay();
          if (pollKoLastRef.current) clearInterval(pollKoLastRef.current);
          if (pollKoStatusRef.current) clearInterval(pollKoStatusRef.current);
          pollKoLastRef.current = null;
          pollKoStatusRef.current = null;
        }
      });
    };
    const pollStatus = () => {
      getAiWorkSummaryStatus(displayLang).then((res) => {
        if (res.success && res.generating) setGeneratingPhase(res.phase ?? 'summarizing');
        else if (res.success && !res.generating) {
          pollLast();
        }
      });
    };
    pollKoLastRef.current = setInterval(pollLast, POLL_LAST_MS);
    pollKoStatusRef.current = setInterval(pollStatus, POLL_STATUS_MS);
    pollLast();
    pollStatus();
    return () => {
      if (pollKoLastRef.current) clearInterval(pollKoLastRef.current);
      if (pollKoStatusRef.current) clearInterval(pollKoStatusRef.current);
      pollKoLastRef.current = null;
      pollKoStatusRef.current = null;
    };
  }, [isSummarizing, displayLang, refetchDisplay]);

  useEffect(() => {
    if (!isTranslating) return;
    const pollLast = () => {
      getAiWorkSummaryLast('zh').then((res) => {
        if (res.success && res.data) {
          setIsTranslating(false);
          setGeneratingPhase(null);
          if (displayLang === 'zh') {
            setData(res.data);
            setGeneratedAt(res.data.generatedAt ?? null);
          }
          refetchDisplay();
          if (pollZhLastRef.current) clearInterval(pollZhLastRef.current);
          if (pollZhStatusRef.current) clearInterval(pollZhStatusRef.current);
          pollZhLastRef.current = null;
          pollZhStatusRef.current = null;
        }
      });
    };
    const pollStatus = () => {
      getAiWorkSummaryStatus('zh').then((res) => {
        if (res.success && res.generating) setGeneratingPhase(res.phase ?? 'translating');
        else if (res.success && !res.generating) {
          pollLast();
        }
      });
    };
    pollZhLastRef.current = setInterval(pollLast, POLL_LAST_MS);
    pollZhStatusRef.current = setInterval(pollStatus, POLL_STATUS_MS);
    pollLast();
    pollStatus();
    return () => {
      if (pollZhLastRef.current) clearInterval(pollZhLastRef.current);
      if (pollZhStatusRef.current) clearInterval(pollZhStatusRef.current);
      pollZhLastRef.current = null;
      pollZhStatusRef.current = null;
    };
  }, [isTranslating, displayLang, refetchDisplay]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      refetchDisplay();
      getAiWorkSummaryLast('ko').then((res) => setHasKoSummary(!!(res.success && res.data)));
      getAiWorkSummaryStatus('ko').then((res) => {
        if (!res.success || !res.generating) return;
        if (res.phase === 'translating') setIsTranslating(true);
        else setIsSummarizing(true);
      });
      getAiWorkSummaryStatus('zh').then((res) => {
        if (!res.success || !res.generating) return;
        if (res.phase === 'translating') setIsTranslating(true);
        else setIsSummarizing(true);
      });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [displayLang]);

  const handleSummarize = async () => {
    setError(null);
    setIsSummarizing(true);
    setGeneratingPhase('summarizing');
    setLoadingSummarize(true);
    const res = await postAiWorkSummary(displayLang);
    setLoadingSummarize(false);
    if (res.success && res.started) {
      // polling will update
    } else if (res.success && res.alreadyGenerating) {
      getAiWorkSummaryStatus(displayLang).then((s) => s.success && s.generating && setGeneratingPhase(s.phase ?? 'summarizing'));
    } else if (res.success && res.data) {
      setIsSummarizing(false);
      setGeneratingPhase(null);
      setHasKoSummary(true);
      setData(res.data);
      if (res.data.generatedAt) setGeneratedAt(res.data.generatedAt);
    } else {
      setIsSummarizing(false);
      setGeneratingPhase(null);
      setError(res.error ?? t('productCollab.summaryError'));
    }
  };

  const handleTranslate = async () => {
    setError(null);
    setIsTranslating(true);
    setGeneratingPhase('translating');
    setLoadingTranslate(true);
    const res = await postAiWorkSummaryTranslate();
    setLoadingTranslate(false);
    if (res.success && res.started) {
      // polling will update
    } else if (res.success && res.alreadyGenerating) {
      getAiWorkSummaryStatus('zh').then((s) => s.success && s.generating && setGeneratingPhase(s.phase ?? 'translating'));
    } else if (res.success && res.data) {
      setIsTranslating(false);
      setGeneratingPhase(null);
      setData(res.data);
      if (res.data.generatedAt) setGeneratedAt(res.data.generatedAt);
    } else {
      setIsTranslating(false);
      setGeneratingPhase(null);
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
  const isBusy = isSummarizing || isTranslating;
  const statusMessage = isSummarizing ? t('productCollab.summarizing') : isTranslating ? t('productCollab.translating') : null;
  /** 내 업무 요약 하단 상세 내역(제품별 요약 테이블) 접기/펼치기. 기본 접힘 */
  const [myTasksDetailExpanded, setMyTasksDetailExpanded] = useState(false);

  return (
    <section className="rounded-none sm:rounded-xl border-2 border-[#E5E7EB] bg-white overflow-hidden mb-6 -mx-6 sm:mx-0">
      <div className="px-4 py-3 bg-[#F3F4F6] border-b border-[#E5E7EB] flex flex-row items-center justify-between gap-2 min-w-0 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 overflow-hidden flex-1">
          <h2 className="text-base sm:text-lg font-semibold text-[#374151] truncate min-w-0">{t('productCollab.aiWorkAssistant')}</h2>
          {agoText && (
            <span className="text-xs sm:text-sm text-[#6B7280] truncate min-w-0">
              ({data?.provider ? `${data.provider === 'openai' ? 'OpenAI' : 'Qwen'} · ${agoText}` : agoText})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={loadingSummarize || isSummarizing}
            onClick={handleSummarize}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingSummarize ? t('productCollab.loading') : t('productCollab.summarize')}
          </button>
          <button
            type="button"
            disabled={loadingTranslate || isTranslating || !hasKoSummary}
            onClick={handleTranslate}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium text-white bg-[#059669] hover:bg-[#047857] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingTranslate ? t('productCollab.loading') : t('productCollab.translate')}
          </button>
        </div>
      </div>
      <div className="p-4">
        {error && (
          <p className="text-red-600 text-sm mb-3" role="alert">
            {error}
          </p>
        )}
        {statusMessage && (
          <p className="text-[#2563EB] text-sm mb-3" role="status">
            {statusMessage}
          </p>
        )}
        {!showResult && !loadingSummarize && !loadingTranslate && !error && !isBusy && (
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
                    <button
                      type="button"
                      onClick={() => setMyTasksDetailExpanded((prev) => !prev)}
                      className={`flex w-full items-center gap-1.5 p-3 text-left text-xs font-medium text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#374151] bg-white ${data.myTasksOverallSummary ? 'border-t border-[#E5E7EB]' : ''}`}
                      aria-expanded={myTasksDetailExpanded}
                    >
                      {myTasksDetailExpanded ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                      {t('productCollab.detailSection')}
                      <span className="text-[#9CA3AF] font-normal">({data.myTasksSummary.length})</span>
                    </button>
                    {myTasksDetailExpanded && (
                      <>
                        <p className="p-3 pt-0 text-xs text-[#6B7280] bg-white border-t border-[#E5E7EB]">
                          <span className="mr-1.5">{t('productCollab.relatedProducts')}:</span>
                          {data.myTasksSummary.map((row, idx) => (
                            <span key={row.productId}>
                              {idx > 0 ? <span className="text-[#9CA3AF] mx-1">·</span> : null}
                              <Link
                                to={`/admin/product-collab/thread/${row.productId}?from=summary`}
                                className="text-[#2563EB] hover:underline"
                              >
                                {row.productName}
                              </Link>
                            </span>
                          ))}
                        </p>
                        <MyTasksSummaryTable items={data.myTasksSummary} />
                      </>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-[#6B7280] text-sm">{t('productCollab.summaryEmpty')}</p>
              )}
            </div>
            {data.statusCategorySummaries && data.statusCategorySummaries.length > 0 ? (
              <div>
                <h3 className="text-base font-semibold text-[#374151] mb-2">
                  {t('productCollab.statusCategorySummaryTitle')}
                </h3>
                <StatusCategorySummaryList
                  items={data.statusCategorySummaries}
                  overallSummary={data.overallSummary}
                />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
