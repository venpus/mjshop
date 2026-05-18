import { SearchBar } from './search-bar';
import { useLanguage } from '../../contexts/LanguageContext';

export interface SubmitSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/** 검색어 입력 + 검색 버튼 (엔터 또는 버튼 클릭 시 onSubmit) */
export function SubmitSearchField({
  value,
  onChange,
  onSubmit,
  placeholder,
  className = '',
  disabled = false,
}: SubmitSearchFieldProps) {
  const { t } = useLanguage();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className={`flex items-stretch gap-2 min-w-[180px] ${className}`}>
      <SearchBar
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="[&_input]:border-[#E5E7EB] [&_input]:rounded-lg [&_input]:text-sm [&_input]:py-2 [&_input]:focus:ring-[#2563EB]"
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled}
        className="px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
      >
        {t('common.search')}
      </button>
    </div>
  );
}
