import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

type ProjectStatus = '진행중' | '홀딩중' | '취소' | '완성';

interface ProjectStatusSelectorProps {
  value: ProjectStatus;
  onChange: (status: ProjectStatus) => void;
  className?: string;
}

const statusOptions: { value: ProjectStatus; label: string; color: string }[] = [
  { value: '진행중', label: '진행중', color: 'bg-blue-100 text-blue-800' },
  { value: '홀딩중', label: '홀딩중', color: 'bg-yellow-100 text-yellow-800' },
  { value: '취소', label: '취소', color: 'bg-gray-100 text-gray-800' },
  { value: '완성', label: '완성', color: 'bg-green-100 text-green-800' },
];

export function ProjectStatusSelector({
  value,
  onChange,
  className = '',
}: ProjectStatusSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentStatus = statusOptions.find(opt => opt.value === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${currentStatus?.color || 'bg-gray-100 text-gray-800'} hover:opacity-80`}
      >
        <span>{currentStatus?.label || value}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 z-20 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[120px]">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                  value === option.value ? option.color : ''
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

