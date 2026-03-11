export interface CostSummaryCardProps {
  label: string;
  value: number;
  format?: 'currency' | 'number';
  currency?: string;
  className?: string;
}

/**
 * 금액/숫자 요약 카드 (재사용)
 */
export function CostSummaryCard({
  label,
  value,
  format = 'currency',
  currency = 'CNY',
  className = '',
}: CostSummaryCardProps) {
  const displayValue =
    format === 'currency'
      ? new Intl.NumberFormat('ko-KR', {
          style: 'currency',
          currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value)
      : new Intl.NumberFormat('ko-KR').format(value);

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}
    >
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900 tabular-nums">
        {displayValue}
      </p>
    </div>
  );
}
