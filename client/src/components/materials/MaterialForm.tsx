import { useState } from 'react';
import { X, Trash2, Upload, Plus } from 'lucide-react';
import { CATEGORY_OPTIONS } from './utils';

export interface MaterialFormData {
  date: string;
  productName: string;
  productNameChinese: string;
  category: string;
  typeCount: number;
  link: string;
  price: number | '';
  productImages: File[];
}

export interface MaterialFormDataWithFiles extends MaterialFormData {
  productImages?: File[];
}

interface MaterialFormProps {
  onClose: () => void;
  onSave: (material: MaterialFormDataWithFiles) => void;
  initialData?: MaterialFormData;
  mode?: 'create' | 'edit';
}

export function MaterialForm({
  onClose,
  onSave,
  initialData,
  mode = 'create',
}: MaterialFormProps) {
  const [formData, setFormData] = useState<MaterialFormData>(
    initialData || {
      date: new Date().toISOString().split('T')[0],
      productName: '',
      productNameChinese: '',
      category: CATEGORY_OPTIONS[0] || '포장용품',
      typeCount: 1,
      link: '',
      price: '',
      productImages: [],
    }
  );

  const [productImagePreviews, setProductImagePreviews] = useState<string[]>([]);

  const handleChange = (field: keyof MaterialFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles = [...formData.productImages, ...files];
    setFormData((prev) => ({ ...prev, productImages: newFiles }));

    // 미리보기 URL 생성
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setProductImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeProductImage = (index: number) => {
    const newFiles = formData.productImages.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, productImages: newFiles }));

    // 미리보기 URL 정리
    const previewUrl = productImagePreviews[index];
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const newPreviews = productImagePreviews.filter((_, i) => i !== index);
    setProductImagePreviews(newPreviews);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 상품명 또는 중문 상품명 중 하나는 반드시 입력되어야 함
    if (!formData.productName.trim() && !formData.productNameChinese.trim()) {
      alert('상품명 또는 중문 상품명 중 하나는 반드시 입력해주세요.');
      return;
    }

    const dataWithFiles: MaterialFormDataWithFiles = {
      ...formData,
      productImages: formData.productImages.length > 0 ? formData.productImages : undefined,
    };
    onSave(dataWithFiles);
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h3 className="text-gray-900 text-lg font-semibold">
            {mode === 'edit' ? '부자재 수정' : '부자재 추가'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* 기본 정보 */}
            <div className="bg-blue-50 rounded-lg p-4 space-y-4">
              <h4 className="text-sm font-bold text-gray-700 mb-3">기본 정보</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    날짜 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleChange('date', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    카테고리 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 상품 정보 */}
            <div className="bg-purple-50 rounded-lg p-4 space-y-4">
              <h4 className="text-sm font-bold text-gray-700 mb-3">상품 정보</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    상품명
                  </label>
                  <input
                    type="text"
                    value={formData.productName}
                    onChange={(e) => handleChange('productName', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="상품명을 입력하세요"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    중문 상품명
                  </label>
                  <input
                    type="text"
                    value={formData.productNameChinese}
                    onChange={(e) => handleChange('productNameChinese', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="중문 상품명을 입력하세요"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    종류 수
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.typeCount}
                    onChange={(e) => handleChange('typeCount', parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    단가 (¥)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => handleChange('price', e.target.value === '' ? '' : parseFloat(e.target.value) || '')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  링크
                </label>
                <input
                  type="url"
                  value={formData.link}
                  onChange={(e) => handleChange('link', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* 제품 사진 */}
            <div className="bg-orange-50 rounded-lg p-4 space-y-4">
              <h4 className="text-sm font-bold text-gray-700 mb-3">제품 사진</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  사진 업로드
                </label>
                <label className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-dashed border-orange-400 rounded-lg text-sm font-medium text-orange-700 hover:bg-orange-50 hover:border-orange-500 cursor-pointer transition-colors">
                  <Upload className="w-5 h-5" />
                  <span>사진 추가하기</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleProductImageChange}
                    className="hidden"
                  />
                </label>
                {productImagePreviews.length > 0 && (
                  <div className="mt-4 grid grid-cols-4 gap-4">
                    {productImagePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img
                          src={preview}
                          alt={`제품 사진 ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => removeProductImage(index)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

