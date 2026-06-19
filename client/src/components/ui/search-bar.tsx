import { Search, X } from 'lucide-react';

export interface SearchBarProps {
  /** 검색어 값 */
  value: string;
  /** 검색어 변경 핸들러 */
  onChange: (value: string) => void;
  /** 키보드 이벤트 핸들러 */
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** 플레이스홀더 텍스트 */
  placeholder?: string;
  /** 추가 클래스명 */
  className?: string;
  /** focus ring 색상 클래스 (tailwind) */
  focusRingClass?: string;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** X 클릭 시 호출 (미지정 시 입력값만 비움) */
  onClear?: () => void;
}

/**
 * 검색 아이콘이 포함된 검색 입력 컴포넌트
 */
export function SearchBar({
  value,
  onChange,
  onKeyDown,
  placeholder = '검색...',
  className = '',
  focusRingClass = 'focus:ring-purple-500',
  disabled = false,
  onClear,
}: SearchBarProps) {
  return (
    <div className={`relative flex-1 ${className}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        className={`w-full pl-10 ${value ? 'pr-10' : 'pr-4'} py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${focusRingClass} disabled:bg-gray-100 disabled:cursor-not-allowed`}
      />
      {value && (
        <button
          type="button"
          onClick={() => (onClear ? onClear() : onChange(''))}
          disabled={disabled}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="검색어 지우기"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
