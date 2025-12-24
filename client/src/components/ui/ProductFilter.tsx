import { X, Filter } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

export interface ProductFilterData {
  priceMin?: number;
  priceMax?: number;
  sizeMin?: number;
  sizeMax?: number;
  weightMin?: number;
  weightMax?: number;
  setCount?: number;
  category?: string;
}

export interface ProductFilterProps {
  /** 필터 데이터 */
  filter: ProductFilterData;
  /** 필터 변경 핸들러 */
  onChange: (filter: ProductFilterData) => void;
  /** 필터 초기화 핸들러 */
  onReset: () => void;
  /** 필터 열림/닫힘 상태 */
  isOpen: boolean;
  /** 필터 열림/닫힘 토글 핸들러 */
  onToggle: () => void;
}

const categories = ['봉제', '키링', '피규어', '잡화'];

/**
 * 상품 필터 컴포넌트
 */
export function ProductFilter({
  filter,
  onChange,
  onReset,
  isOpen,
  onToggle,
}: ProductFilterProps) {
  const filterRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 필터 패널 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        if (isOpen) {
          onToggle();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onToggle]);

  const handleChange = (field: keyof ProductFilterData, value: any) => {
    onChange({
      ...filter,
      [field]: value === '' ? undefined : value,
    });
  };

  const hasActiveFilter = 
    filter.priceMin !== undefined ||
    filter.priceMax !== undefined ||
    filter.sizeMin !== undefined ||
    filter.sizeMax !== undefined ||
    filter.weightMin !== undefined ||
    filter.weightMax !== undefined ||
    filter.setCount !== undefined ||
    filter.category !== undefined;

  return (
    <div className="relative" ref={filterRef}>
      {/* 필터 버튼 */}
      <button
        onClick={onToggle}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
          hasActiveFilter
            ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }`}
      >
        <Filter className="w-4 h-4" />
        <span>필터</span>
        {hasActiveFilter && (
          <span className="bg-white text-purple-600 text-xs font-semibold px-1.5 py-0.5 rounded-full">
            활성
          </span>
        )}
      </button>

      {/* 필터 패널 */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">필터</h3>
            <button
              onClick={onToggle}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {/* 단가 필터 */}
            <div className="mx-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                단가 (¥)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="number"
                    placeholder="최소"
                    value={filter.priceMin || ''}
                    onChange={(e) => handleChange('priceMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    min="0"
                    step="0.01"
                  />
                  <span className="text-xs text-gray-500 mt-1 block">이상</span>
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="최대"
                    value={filter.priceMax || ''}
                    onChange={(e) => handleChange('priceMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    min="0"
                    step="0.01"
                  />
                  <span className="text-xs text-gray-500 mt-1 block">이하</span>
                </div>
              </div>
            </div>

            {/* 크기 필터 */}
            <div className="mx-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                크기 (cm)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="number"
                    placeholder="최소"
                    value={filter.sizeMin || ''}
                    onChange={(e) => handleChange('sizeMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    min="0"
                    step="0.1"
                  />
                  <span className="text-xs text-gray-500 mt-1 block">이상</span>
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="최대"
                    value={filter.sizeMax || ''}
                    onChange={(e) => handleChange('sizeMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    min="0"
                    step="0.1"
                  />
                  <span className="text-xs text-gray-500 mt-1 block">이하</span>
                </div>
              </div>
            </div>

            {/* 무게 필터 */}
            <div className="mx-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                무게 (g)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="number"
                    placeholder="최소"
                    value={filter.weightMin || ''}
                    onChange={(e) => handleChange('weightMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    min="0"
                    step="0.1"
                  />
                  <span className="text-xs text-gray-500 mt-1 block">이상</span>
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="최대"
                    value={filter.weightMax || ''}
                    onChange={(e) => handleChange('weightMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    min="0"
                    step="0.1"
                  />
                  <span className="text-xs text-gray-500 mt-1 block">이하</span>
                </div>
              </div>
            </div>

            {/* 세트 모델수 필터 */}
            <div className="mx-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                세트 모델수
              </label>
              <input
                type="number"
                placeholder="세트 모델수"
                value={filter.setCount || ''}
                onChange={(e) => handleChange('setCount', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                min="1"
              />
            </div>

            {/* 카테고리 필터 */}
            <div className="mx-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                카테고리
              </label>
              <select
                value={filter.category || ''}
                onChange={(e) => handleChange('category', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              >
                <option value="">전체</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 필터 액션 버튼 */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={onReset}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              초기화
            </button>
            <button
              onClick={onToggle}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              적용
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

