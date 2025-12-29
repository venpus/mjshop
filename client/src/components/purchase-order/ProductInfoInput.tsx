import { useState } from 'react';

export interface ProductInfoInputData {
  product_name: string;
  product_name_chinese?: string;
  product_category: string;
  product_main_image?: string;
  product_size?: string;
  product_weight?: string;
  product_packaging_size?: string;
  product_set_count?: number;
  product_small_pack_count: number;
  product_box_count: number;
}

interface ProductInfoInputProps {
  data: ProductInfoInputData;
  onChange: (data: ProductInfoInputData) => void;
  errors?: Partial<Record<keyof ProductInfoInputData, string>>;
  hideMainImage?: boolean; // 메인 이미지 URL 필드를 숨길지 여부
}

const CATEGORY_OPTIONS = ['봉제', '키링', '피규어', '잡화'] as const;

/**
 * 상품 정보 입력 컴포넌트
 */
export function ProductInfoInput({ data, onChange, errors = {}, hideMainImage = false }: ProductInfoInputProps) {
  const handleChange = (field: keyof ProductInfoInputData, value: string | number) => {
    onChange({
      ...data,
      [field]: value,
    });
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <h4 className="text-sm font-semibold text-gray-700 mb-4">상품 정보</h4>
      <div className="grid grid-cols-2 gap-4">
        {/* 상품명 (한국어) */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            상품명 (한국어)
          </label>
          <input
            type="text"
            value={data.product_name}
            onChange={(e) => handleChange('product_name', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
              errors.product_name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="한국어 상품명을 입력하세요"
          />
          {errors.product_name && (
            <p className="mt-1 text-xs text-red-500">{errors.product_name}</p>
          )}
        </div>

        {/* 중문 상품명 */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            상품명 (중국어)
          </label>
          <input
            type="text"
            value={data.product_name_chinese || ''}
            onChange={(e) => handleChange('product_name_chinese', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="중문 상품명을 입력하세요"
          />
        </div>

        {/* 카테고리 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            카테고리 <span className="text-red-500">*</span>
          </label>
          <select
            value={data.product_category}
            onChange={(e) => handleChange('product_category', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
              errors.product_category ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            {CATEGORY_OPTIONS.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* 메인 이미지 URL (hideMainImage가 true이면 숨김) */}
        {!hideMainImage && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              메인 이미지 URL
            </label>
            <input
              type="url"
              value={data.product_main_image || ''}
              onChange={(e) => handleChange('product_main_image', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="https://..."
            />
          </div>
        )}

        {/* 크기 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            상품 크기
          </label>
          <input
            type="text"
            value={data.product_size || ''}
            onChange={(e) => handleChange('product_size', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="예: 5x3x2"
          />
        </div>

        {/* 무게 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            상품 무게
          </label>
          <input
            type="text"
            value={data.product_weight || ''}
            onChange={(e) => handleChange('product_weight', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="예: 50g"
          />
        </div>

        {/* 종류 수 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            종류 수
          </label>
          <input
            type="number"
            min="1"
            value={data.product_set_count ?? ''}
            onChange={(e) => handleChange('product_set_count', e.target.value === '' ? undefined : parseInt(e.target.value) || undefined)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>
    </div>
  );
}

