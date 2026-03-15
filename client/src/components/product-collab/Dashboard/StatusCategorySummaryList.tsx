import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { StatusCategorySummary, OverallSummaryProduct } from '../../../api/productCollabApi';
import { OverallSummaryTable } from './OverallSummaryTable';

/** 상태 코드 → i18n 키 (productCollab.statusXxx) */
const STATUS_I18N_KEYS: Record<string, string> = {
  RESEARCH: 'productCollab.statusResearch',
  SAMPLE_TEST: 'productCollab.statusSampleTest',
  CONFIG_CONFIRM: 'productCollab.statusConfigConfirm',
  ORDER_PENDING: 'productCollab.statusOrderPending',
  INCOMING: 'productCollab.statusIncoming',
  IN_PRODUCTION: 'productCollab.statusInProduction',
  PRODUCTION_COMPLETE: 'productCollab.statusProductionComplete',
  ISSUE_OCCURRED: 'productCollab.statusIssueOccurred',
  CANCELLED: 'productCollab.statusCancelled',
};

/** 카테고리 제목 강조용 색상 (순서: 문제발생→발주대기→샘플테스트→…) */
const STATUS_TITLE_CLASSES: Record<string, string> = {
  ISSUE_OCCURRED: 'font-semibold text-red-600',
  ORDER_PENDING: 'font-semibold text-amber-700',
  SAMPLE_TEST: 'font-semibold text-blue-600',
  CONFIG_CONFIRM: 'font-semibold text-indigo-600',
  RESEARCH: 'font-semibold text-slate-600',
  INCOMING: 'font-semibold text-teal-600',
  IN_PRODUCTION: 'font-semibold text-green-600',
  PRODUCTION_COMPLETE: 'font-semibold text-gray-500',
  CANCELLED: 'font-semibold text-gray-400',
};

export interface StatusCategorySummaryListProps {
  items: StatusCategorySummary[];
  /** 전체 업무 요약(제품별 상세). 상태별 상세내역에 사용 */
  overallSummary?: OverallSummaryProduct[];
}

function getStatusLabel(t: (key: string) => string, status: string): string {
  return STATUS_I18N_KEYS[status] ? t(STATUS_I18N_KEYS[status]) : status;
}

function getTitleClassName(status: string): string {
  return STATUS_TITLE_CLASSES[status] ?? 'font-medium text-[#374151]';
}

function getDetailProductsForStatus(
  overallSummary: OverallSummaryProduct[],
  status: string,
  productOrder: { productId: number }[]
): OverallSummaryProduct[] {
  const byId = new Map(overallSummary.filter((p) => p.status === status).map((p) => [p.productId, p]));
  const ordered: OverallSummaryProduct[] = [];
  for (const { productId } of productOrder) {
    const p = byId.get(productId);
    if (p) ordered.push(p);
  }
  byId.forEach((p) => {
    if (!ordered.some((o) => o.productId === p.productId)) ordered.push(p);
  });
  return ordered;
}

export function StatusCategorySummaryList({ items, overallSummary = [] }: StatusCategorySummaryListProps) {
  const { t } = useLanguage();
  /** 한 번에 하나의 상세내역만 펼침 */
  const [expandedStatus, setExpandedStatus] = useState<string | null>(null);

  const toggleExpanded = (status: string) => {
    setExpandedStatus((prev) => (prev === status ? null : status));
  };

  if (!items.length) return null;

  return (
    <div className="rounded-lg border border-[#E5E7EB] divide-y divide-[#E5E7EB] overflow-hidden">
      {items.map((item) => {
        const detailProducts = overallSummary.length > 0 && item.products?.length
          ? getDetailProductsForStatus(overallSummary, item.status, item.products)
          : [];
        const hasDetail = detailProducts.length > 0;
        const isExpanded = expandedStatus === item.status;

        return (
          <div
            key={item.status}
            className="bg-white p-3 text-sm text-[#1F2937] hover:bg-[#F9FAFB]"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1.5">
              <span className={getTitleClassName(item.status)}>
                {getStatusLabel(t, item.status)}
              </span>
              <span className="text-[#9CA3AF]">({item.productCount}건)</span>
            </div>
            <p className="text-[#374151] pl-0">{item.summary}</p>
            {item.products && item.products.length > 0 && (
              <p className="text-[#6B7280] text-xs mt-2 pl-0">
                <span className="mr-1.5">{t('productCollab.relatedProducts')}:</span>
                {item.products.map((prod, idx) => (
                  <span key={prod.productId}>
                    {idx > 0 && <span className="text-[#9CA3AF] mx-1">·</span>}
                    <Link
                      to={`/admin/product-collab/thread/${prod.productId}?from=summary`}
                      className="text-[#2563EB] hover:underline"
                    >
                      {prod.productName}
                    </Link>
                  </span>
                ))}
              </p>
            )}
            {hasDetail && (
              <div className="mt-3 border-t border-[#E5E7EB] pt-2">
                <button
                  type="button"
                  onClick={() => toggleExpanded(item.status)}
                  className="flex items-center gap-1.5 text-[#6B7280] hover:text-[#374151] text-xs font-medium"
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {t('productCollab.detailSection')}
                  <span className="text-[#9CA3AF] font-normal">({detailProducts.length})</span>
                </button>
                {isExpanded && (
                  <div className="mt-2 ml-1">
                    <OverallSummaryTable products={detailProducts} />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
