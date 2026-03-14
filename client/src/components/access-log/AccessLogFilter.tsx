import { useLanguage } from '../../contexts/LanguageContext';

export interface AccessLogFilterOption {
  value: string;
  label: string;
}

export interface AccessLogFilterProps {
  options: AccessLogFilterOption[];
  selectedValue: string;
  onSelectionChange: (value: string) => void;
  disabled?: boolean;
  loadingOptions?: boolean;
}

export function AccessLogFilter({
  options,
  selectedValue,
  onSelectionChange,
  disabled,
  loadingOptions,
}: AccessLogFilterProps) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-sm text-gray-600 whitespace-nowrap">
        {t('accessLog.filterByUserName')}
      </label>
      <select
        value={selectedValue}
        onChange={(e) => onSelectionChange(e.target.value)}
        disabled={disabled || loadingOptions}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[10rem] max-w-full focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
      >
        {options.map((opt) => (
          <option key={opt.value || '__all__'} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
