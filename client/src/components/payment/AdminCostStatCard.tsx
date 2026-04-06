import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { AdminCostDetail } from '../../utils/adminCostStatistics';

export interface AdminCostStatCardProps {
  title: string;
  isLoading: boolean;
  total: number;
  detail: AdminCostDetail;
  highlightClassName: string;
  /** 설정 시 카드 클릭으로 상세 모달 등 열기 */
  onCardClick?: () => void;
  /** 클릭 가능일 때 테두리/포커스 링 색 (Tailwind 클래스) */
  clickableAccentClassName?: string;
}

function useFormatCurrency() {
  return (amount: number) => `¥${amount.toLocaleString('ko-KR')}`;
}

export function AdminCostDetailBlocks({
  total,
  detail,
  highlightClassName,
}: {
  total: number;
  detail: AdminCostDetail;
  highlightClassName: string;
}) {
  const { t } = useLanguage();
  const formatCurrency = useFormatCurrency();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-center px-4 py-3 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-300 shadow-sm">
        <span className={`text-3xl font-bold ${highlightClassName}`}>{formatCurrency(total)}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center justify-center px-3 py-2.5 rounded-lg bg-teal-50 border border-teal-300 shadow-sm">
          <span className="text-xs text-teal-600 font-semibold mb-1">{t('payment.orderCost')}</span>
          <span className="text-base font-bold text-teal-700">{formatCurrency(detail.backMargin)}</span>
        </div>
        <div className="flex flex-col items-center justify-center px-3 py-2.5 rounded-lg bg-purple-50 border border-purple-300 shadow-sm">
          <span className="text-xs text-purple-600 font-semibold mb-1">{t('payment.adminInput')}</span>
          <span className="text-base font-bold text-purple-700">{formatCurrency(detail.adminCostItems)}</span>
        </div>
        <div className="flex flex-col items-center justify-center px-3 py-2.5 rounded-lg bg-cyan-50 border border-cyan-300 shadow-sm">
          <span className="text-xs text-cyan-600 font-semibold mb-1">{t('payment.shippingExtra')}</span>
          <span className="text-base font-bold text-cyan-700">{formatCurrency(detail.shippingDifference)}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * A레벨 관리자 비용 통계용 카드 (제목·로딩·상세 블록 재사용)
 */
export function AdminCostStatCard({
  title,
  isLoading,
  total,
  detail,
  highlightClassName,
  onCardClick,
  clickableAccentClassName = 'hover:border-amber-400 focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-500',
}: AdminCostStatCardProps) {
  const clickable = Boolean(onCardClick) && !isLoading;
  return (
    <div
      className={`bg-white p-6 rounded-xl border-2 border-gray-200 shadow-md transition-shadow ${
        clickable ? `cursor-pointer hover:shadow-lg ${clickableAccentClassName}` : 'hover:shadow-lg'
      }`}
      onClick={clickable ? onCardClick : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onCardClick?.();
              }
            }
          : undefined
      }
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">{title}</h3>
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-2xl font-bold text-gray-400">-</p>
        </div>
      ) : (
        <AdminCostDetailBlocks total={total} detail={detail} highlightClassName={highlightClassName} />
      )}
    </div>
  );
}
