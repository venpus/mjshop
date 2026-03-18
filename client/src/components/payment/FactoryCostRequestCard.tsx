import React from 'react';
import { Coins } from 'lucide-react';

export interface FactoryCostRequestCardProps {
  title: string;
  hint: string;
  totalCny: number;
  loading: boolean;
  onClick: () => void;
}

/**
 * 공장 비용 처리 요청 금액 — 금일 지급요청 카드와 동일 줄 오른쪽용 (번역 문자열은 부모에서 전달)
 */
export function FactoryCostRequestCard({ title, hint, totalCny, loading, onClick }: FactoryCostRequestCardProps) {
  const formatted = `¥${totalCny.toLocaleString('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="bg-white p-6 rounded-xl border-2 border-gray-200 shadow-md hover:shadow-lg hover:border-amber-400 cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 h-full flex flex-col"
    >
      <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200 flex items-center gap-2">
        <Coins className="w-5 h-5 text-amber-700 shrink-0" />
        <span className="leading-tight">{title}</span>
      </h3>
      {loading ? (
        <div className="flex items-center justify-center flex-1 min-h-[8rem]">
          <p className="text-2xl font-bold text-gray-400">-</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 flex-1">
          <div className="flex items-center justify-center px-4 py-3 rounded-lg bg-gradient-to-r from-gray-50 to-amber-50/80 border-2 border-gray-300 shadow-sm">
            <span className="text-3xl font-bold text-amber-800 tabular-nums">{formatted}</span>
          </div>
          <p className="text-xs text-gray-500 text-center leading-relaxed">{hint}</p>
        </div>
      )}
    </div>
  );
}
