export interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  disabled?: boolean;
  startLabel?: string;
  endLabel?: string;
}

/**
 * 날짜 범위 입력 (시작일/종료일)
 * 재사용 가능한 컴포넌트
 */
export function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  disabled = false,
  startLabel = '시작일',
  endLabel = '종료일',
}: DateRangeFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{startLabel}</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          disabled={disabled}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        />
      </label>
      <label className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{endLabel}</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          disabled={disabled}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        />
      </label>
    </div>
  );
}
