import { useState } from "react";
import { X, Upload, Trash2, Plus } from "lucide-react";

interface ProductFormProps {
  onClose: () => void;
  onSave: (product: ProductFormData) => void;
  initialData?: ProductFormData;
  mode?: "create" | "edit";
}

export interface ProductFormData {
  name: string;
  category: string;
  price: number;
  size: string;
  packagingSize: string;
  weight: string;
  setCount: number;
  smallPackCount: number;
  boxCount: number;
  options?: { name: string; price: number }[];
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
      price: 0,
      size: "",
      packagingSize: "",
      weight: "",
      setCount: 1,
      smallPackCount: 0,
      boxCount: 0,
      options: [],
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
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
    const remainingSlots = 20 - infoImages.length;
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
  };

  const removeInfoImage = (index: number) => {
    setInfoImages((prev) => prev.filter((_, i) => i !== index));
    setInfoImagePreviews((prev) =>
      prev.filter((_, i) => i !== index),
    );
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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

              <div className="grid grid-cols-6 gap-2">
                {/* Main Image Upload */}
                {mainImagePreview ? (
                  <div className="relative border-2 border-purple-300 rounded-lg overflow-hidden aspect-square bg-gray-50">
                    <div className="absolute top-1 left-1 z-10 bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded">
                      대표
                    </div>
                    <img
                      src={mainImagePreview}
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
                  <label className="border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-purple-400 transition-colors cursor-pointer aspect-square flex flex-col items-center justify-center bg-purple-50">
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

                {/* Info Images */}
                {infoImagePreviews.map((preview, index) => (
                  <div
                    key={index}
                    className="relative border border-gray-300 rounded-lg overflow-hidden aspect-square bg-gray-50"
                  >
                    <img
                      src={preview}
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

                {/* Add More Info Images Button */}
                {infoImages.length < 20 && (
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
                      {infoImages.length}/20
                    </p>
                  </label>
                )}
              </div>
            </div>

            {/* Product Name */}
            <div>
              <label className="block text-gray-700 mb-2">
                상품명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  handleChange("name", e.target.value)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="상품명을 입력하세요"
              />
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

            {/* Cost Section */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <h4 className="text-gray-700 mb-3">비용</h4>
                  <div className="flex items-center gap-4 mb-3">
                    <label className="text-gray-700 whitespace-nowrap">
                      단가 (¥){" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) =>
                        handleChange(
                          "price",
                          Number(e.target.value),
                        )
                      }
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-white"
                      placeholder="0"
                    />
                  </div>

                  {/* Options */}
                  {formData.options &&
                    formData.options.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {formData.options.map(
                          (option, index) => (
                            <div
                              key={index}
                              className="grid grid-cols-2 gap-2"
                            >
                              <select
                                value={option.name}
                                onChange={(e) =>
                                  updateOption(
                                    index,
                                    "name",
                                    e.target.value,
                                  )
                                }
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                              >
                                <option value="">
                                  옵션 선택
                                </option>
                                <option value="택">택</option>
                                <option value="고리">
                                  고리
                                </option>
                                <option value="포장-봉지">
                                  포장-봉지
                                </option>
                                <option value="포장-파우치">
                                  포장-파우치
                                </option>
                                <option value="포장-박스">
                                  포장-박스
                                </option>
                                <option value="인건비">
                                  인건비
                                </option>
                              </select>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={option.price}
                                  onChange={(e) =>
                                    updateOption(
                                      index,
                                      "price",
                                      Number(e.target.value),
                                    )
                                  }
                                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-white"
                                  placeholder="비용"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeOption(index)
                                  }
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    )}

                  <button
                    type="button"
                    onClick={addOption}
                    className="flex items-center gap-2 px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>옵션 추가</span>
                  </button>
                </div>

                {/* Total Price */}
                <div className="bg-white border border-gray-300 rounded-lg p-4 min-w-[160px]">
                  <div className="text-gray-600 text-sm mb-2">
                    총 금액
                  </div>
                  <div className="text-purple-600 text-2xl">
                    ¥
                    {(
                      formData.price +
                      (formData.options?.reduce(
                        (sum, opt) => sum + opt.price,
                        0,
                      ) || 0)
                    ).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Size, Packaging Size, and Weight */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">
                  사이즈(cm)
                </label>
                <input
                  type="text"
                  value={formData.size}
                  onChange={(e) =>
                    handleChange("size", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="예: 30x20x15cm"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">
                  포장 사이즈(cm)
                </label>
                <input
                  type="text"
                  value={formData.packagingSize}
                  onChange={(e) =>
                    handleChange(
                      "packagingSize",
                      e.target.value,
                    )
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="예: 35x25x20cm"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">
                  제품 무게(cm)
                </label>
                <input
                  type="text"
                  value={formData.weight}
                  onChange={(e) =>
                    handleChange("weight", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="예: 500g"
                />
              </div>
            </div>

            {/* Set Count, Small Pack Count, Box Count */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">
                  세트 모델수(개){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.setCount}
                  onChange={(e) =>
                    handleChange(
                      "setCount",
                      Number(e.target.value),
                    )
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">
                  소포장 입수(개)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.smallPackCount}
                  onChange={(e) =>
                    handleChange(
                      "smallPackCount",
                      Number(e.target.value),
                    )
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">
                  한박스 입수(개)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.boxCount}
                  onChange={(e) =>
                    handleChange(
                      "boxCount",
                      Number(e.target.value),
                    )
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="0"
                />
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