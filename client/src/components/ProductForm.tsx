import { useState, useEffect, useRef } from "react";
import { X, Upload, Trash2, Plus, Check } from "lucide-react";

interface ProductFormProps {
  onClose: () => void;
  onSave: (product: ProductFormDataWithFiles) => void;
  initialData?: ProductFormData;
  mode?: "create" | "edit";
}

export interface ProductFormData {
  name: string;
  nameChinese?: string;
  category: string;
  price: number | "";
  size: string;
  setCount: number;
  weight?: string;
  supplier?: {
    name: string;
    url: string;
  };
  // 기존 이미지 URL (수정 모드용)
  existingMainImageUrl?: string;
  existingInfoImageUrls?: string[];
}

// 이미지 파일을 포함한 상품 데이터
export interface ProductFormDataWithFiles extends ProductFormData {
  mainImage?: File;
  infoImages?: File[];
  existingMainImageUrl?: string;
  existingInfoImageUrls?: string[];
}

export function ProductForm({
  onClose,
  onSave,
  initialData,
  mode = "create",
}: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>(
    initialData || {
      name: "",
      category: "봉제",
      price: "", // 빈 값으로 초기화
      size: "",
      setCount: 1,
      weight: "",
    },
  );

  const [mainImage, setMainImage] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<
    string | null
  >(null);
  const [infoImages, setInfoImages] = useState<File[]>([]);
  const [infoImagePreviews, setInfoImagePreviews] = useState<
    string[]
  >([]);
  const [existingMainImageUrl, setExistingMainImageUrl] = useState<string | null>(null);
  const [existingInfoImageUrls, setExistingInfoImageUrls] = useState<string[]>([]);
  
  // 공급상 자동완성 관련 상태
  const [supplierSuggestions, setSupplierSuggestions] = useState<Array<{ id: number; name: string; url: string | null }>>([]);
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);
  const [isSearchingSuppliers, setIsSearchingSuppliers] = useState(false);
  const supplierSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const supplierInputRef = useRef<HTMLInputElement>(null);
  const supplierSuggestionsRef = useRef<HTMLDivElement>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  // 초기 데이터 로드 시 기존 이미지 설정
  useEffect(() => {
    if (initialData) {
      if (initialData.existingMainImageUrl) {
        setExistingMainImageUrl(initialData.existingMainImageUrl);
      }
      if (initialData.existingInfoImageUrls) {
        setExistingInfoImageUrls(initialData.existingInfoImageUrls);
      }
    }
  }, [initialData]);

  // 공급상 검색 함수
  const searchSuppliers = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSupplierSuggestions([]);
      setShowSupplierSuggestions(false);
      return;
    }

    setIsSearchingSuppliers(true);
    try {
      const response = await fetch(`${API_BASE_URL}/products/suppliers/search?q=${encodeURIComponent(searchTerm)}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSupplierSuggestions(data.data);
          setShowSupplierSuggestions(data.data.length > 0);
        }
      }
    } catch (error) {
      console.error('공급상 검색 오류:', error);
      setSupplierSuggestions([]);
      setShowSupplierSuggestions(false);
    } finally {
      setIsSearchingSuppliers(false);
    }
  };

  // 공급상 이름 변경 핸들러 (debounce 적용)
  const handleSupplierNameChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      supplier: {
        name: value,
        url: prev.supplier?.url || "",
      },
    }));

    // 기존 타이머 취소
    if (supplierSearchTimeoutRef.current) {
      clearTimeout(supplierSearchTimeoutRef.current);
    }

    // 300ms 후 검색 실행
    supplierSearchTimeoutRef.current = setTimeout(() => {
      searchSuppliers(value);
    }, 300);
  };

  // 공급상 선택 핸들러
  const handleSelectSupplier = (supplier: { id: number; name: string; url: string | null }) => {
    setFormData((prev) => ({
      ...prev,
      supplier: {
        name: supplier.name,
        url: supplier.url || "",
      },
    }));
    setShowSupplierSuggestions(false);
    setSupplierSuggestions([]);
  };

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        supplierInputRef.current &&
        !supplierInputRef.current.contains(event.target as Node) &&
        supplierSuggestionsRef.current &&
        !supplierSuggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSupplierSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (supplierSearchTimeoutRef.current) {
        clearTimeout(supplierSearchTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 상품명과 중문 상품명 중 하나는 반드시 입력되어야 함
    if (!formData.name.trim() && !formData.nameChinese?.trim()) {
      alert('상품명 또는 중문 상품명 중 하나는 반드시 입력해주세요.');
      return;
    }
    
    const dataWithFiles: ProductFormDataWithFiles = {
      ...formData,
      mainImage: mainImage || undefined,
      infoImages: infoImages.length > 0 ? infoImages : undefined,
      existingMainImageUrl: existingMainImageUrl || undefined,
      existingInfoImageUrls: existingInfoImageUrls.length > 0 ? existingInfoImageUrls : undefined,
    };
    onSave(dataWithFiles);
  };

  const handleChange = (
    field: keyof ProductFormData,
    value: string | number,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleMainImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setMainImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMainImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInfoImagesChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files || []);
    const remainingSlots = 20 - (infoImages.length + existingInfoImageUrls.length);
    const filesToAdd = files.slice(0, remainingSlots);

    if (filesToAdd.length > 0) {
      setInfoImages((prev) => [...prev, ...filesToAdd]);

      // Create previews
      filesToAdd.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setInfoImagePreviews((prev) => [
            ...prev,
            reader.result as string,
          ]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeMainImage = () => {
    setMainImage(null);
    setMainImagePreview(null);
    setExistingMainImageUrl(null);
  };

  const removeInfoImage = (index: number) => {
    // 기존 이미지인지 새로 추가한 이미지인지 확인
    if (index < existingInfoImageUrls.length) {
      // 기존 이미지 제거
      setExistingInfoImageUrls((prev) => prev.filter((_, i) => i !== index));
    } else {
      // 새로 추가한 이미지 제거
      const fileIndex = index - existingInfoImageUrls.length;
      setInfoImages((prev) => prev.filter((_, i) => i !== fileIndex));
      setInfoImagePreviews((prev) =>
        prev.filter((_, i) => i !== index),
      );
    }
  };

  const addOption = () => {
    const currentOptions = formData.options || [];
    setFormData((prev) => ({
      ...prev,
      options: [...currentOptions, { name: "", price: 0 }],
    }));
  };

  const removeOption = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      options:
        prev.options?.filter((_, i) => i !== index) || [],
    }));
  };

  const updateOption = (
    index: number,
    field: "name" | "price",
    value: string | number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      options:
        prev.options?.map((option, i) =>
          i === index ? { ...option, [field]: value } : option,
        ) || [],
    }));
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h3 className="text-gray-900">
            {mode === "edit" ? "상품 수정" : "상품 등록"}
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
          <div className="space-y-4">
            {/* Image Upload Section */}
            <div>
              <label className="block text-gray-700 mb-2">
                이미지 업로드{" "}
                <span className="text-red-500">*</span>
              </label>

              {/* 대표 이미지 섹션 (상단) */}
              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-2">대표 이미지</label>
                <div className="flex gap-2">
                  {(mainImagePreview || existingMainImageUrl) ? (
                    <div className="relative border-2 border-purple-300 rounded-lg overflow-hidden aspect-square bg-gray-50 w-32">
                      <div className="absolute top-1 left-1 z-10 bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded">
                        대표
                      </div>
                      <img
                        src={mainImagePreview || existingMainImageUrl || ""}
                        alt="대표 이미지"
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={removeMainImage}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-purple-400 transition-colors cursor-pointer aspect-square flex flex-col items-center justify-center bg-purple-50 w-32">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleMainImageChange}
                        className="hidden"
                      />
                      <Upload className="w-6 h-6 text-purple-400 mb-1" />
                      <p className="text-purple-600 text-xs">
                        대표 이미지
                      </p>
                    </label>
                  )}
                </div>
              </div>

              {/* 정보 이미지 섹션 (하단) */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">상품 정보 사진</label>
                <div className="grid grid-cols-6 gap-2">
                  {/* 기존 정보 이미지들 */}
                  {existingInfoImageUrls.map((url, index) => (
                    <div
                      key={`existing-${index}`}
                      className="relative border border-gray-300 rounded-lg overflow-hidden aspect-square bg-gray-50"
                    >
                      <img
                        src={url}
                        alt={`상품 정보 ${index + 1}`}
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => removeInfoImage(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {/* 새로 추가한 정보 이미지들 */}
                  {infoImagePreviews.map((preview, index) => (
                    <div
                      key={`new-${index}`}
                      className="relative border border-gray-300 rounded-lg overflow-hidden aspect-square bg-gray-50"
                    >
                      <img
                        src={preview}
                        alt={`상품 정보 ${existingInfoImageUrls.length + index + 1}`}
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => removeInfoImage(existingInfoImageUrls.length + index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {/* Add More Info Images Button */}
                  {(infoImages.length + existingInfoImageUrls.length) < 20 && (
                    <label className="border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-purple-400 transition-colors cursor-pointer aspect-square flex flex-col items-center justify-center">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleInfoImagesChange}
                        className="hidden"
                      />
                      <Upload className="w-6 h-6 text-gray-400 mb-1" />
                      <p className="text-gray-600 text-xs">
                        정보 사진
                      </p>
                      <p className="text-gray-400 text-xs">
                        {infoImages.length + existingInfoImageUrls.length}/20
                      </p>
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-gray-700 mb-2">
                카테고리 <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) =>
                  handleChange("category", e.target.value)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="봉제">봉제</option>
                <option value="키링">키링</option>
                <option value="피규어">피규어</option>
                <option value="잡화">잡화</option>
              </select>
            </div>

            {/* Product Name and Chinese Product Name in one row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Product Name */}
              <div>
                <label className="block text-gray-700 mb-2">
                  상품명 <span className="text-gray-500 text-xs">(상품명 또는 중문 상품명 중 하나 필수)</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    handleChange("name", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="상품명을 입력하세요"
                />
              </div>

              {/* Chinese Product Name */}
              <div>
                <label className="block text-gray-700 mb-2">
                  중문 상품명 <span className="text-gray-500 text-xs">(상품명 또는 중문 상품명 중 하나 필수)</span>
                </label>
                <input
                  type="text"
                  value={formData.nameChinese || ""}
                  onChange={(e) =>
                    handleChange("nameChinese", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="중문 상품명을 입력하세요"
                />
              </div>
            </div>

            {/* Price, Size, Set Count, Weight in one row */}
            <div className="grid grid-cols-4 gap-4">
              {/* Cost Section */}
              <div>
                <label className="block text-gray-700 mb-2">
                  단가 (¥) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.price === "" ? "" : formData.price}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleChange("price", value === "" ? "" : Number(value));
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0"
                />
              </div>

              {/* Size */}
              <div>
                <label className="block text-gray-700 mb-2">
                  사이즈(cm)
                </label>
                <input
                  type="text"
                  value={formData.size}
                  onChange={(e) => handleChange("size", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="예: 30x20x15cm"
                />
              </div>

              {/* Set Count */}
              <div>
                <label className="block text-gray-700 mb-2">
                  세트 모델수(개) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.setCount}
                  onChange={(e) =>
                    handleChange("setCount", Number(e.target.value))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="1"
                />
              </div>

              {/* Weight */}
              <div>
                <label className="block text-gray-700 mb-2">
                  무게(g)
                </label>
                <input
                  type="text"
                  value={formData.weight || ""}
                  onChange={(e) => handleChange("weight", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="예: 500"
                />
              </div>
            </div>

            {/* Supplier Section */}
            <div className="border-t border-gray-200 pt-4">
              <label className="block text-gray-700 mb-2">
                공급상 정보
              </label>
              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-gray-600 text-sm mb-1">
                    공급상 이름
                  </label>
                  <div className="relative">
                    <input
                      ref={supplierInputRef}
                      type="text"
                      value={formData.supplier?.name || ""}
                      onChange={(e) => handleSupplierNameChange(e.target.value)}
                      onFocus={() => {
                        if (supplierSuggestions.length > 0) {
                          setShowSupplierSuggestions(true);
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="공급상 이름을 입력하세요"
                    />
                    {isSearchingSuppliers && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  {/* 자동완성 드롭다운 */}
                  {showSupplierSuggestions && supplierSuggestions.length > 0 && (
                    <div
                      ref={supplierSuggestionsRef}
                      className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                    >
                      {supplierSuggestions.map((supplier) => (
                        <button
                          key={supplier.id}
                          type="button"
                          onClick={() => handleSelectSupplier(supplier)}
                          className="w-full px-4 py-2 text-left hover:bg-purple-50 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <div className="text-gray-900 font-medium">{supplier.name}</div>
                            {supplier.url && (
                              <div className="text-xs text-gray-500 truncate">{supplier.url}</div>
                            )}
                          </div>
                          <Check className="w-4 h-4 text-purple-600 flex-shrink-0 ml-2" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-gray-600 text-sm mb-1">
                    공급상 URL
                  </label>
                  <input
                    type="url"
                    value={formData.supplier?.url || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        supplier: {
                          name: prev.supplier?.name || "",
                          url: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              {mode === "edit" ? "수정하기" : "등록하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}