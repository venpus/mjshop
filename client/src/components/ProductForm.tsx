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
  nameChinese?: string;
  category: string;
  price: number;
  size: string;
  setCount: number;
  supplier?: {
    name: string;
    url: string;
  };
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
      setCount: 1,
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

            {/* Chinese Product Name (Optional) */}
            <div>
              <label className="block text-gray-700 mb-2">
                중문 상품명
              </label>
              <input
                type="text"
                value={formData.nameChinese || ""}
                onChange={(e) =>
                  handleChange("nameChinese", e.target.value)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="중문 상품명을 입력하세요 (선택사항)"
              />
            </div>

            {/* Price, Size, Set Count in one row */}
            <div className="grid grid-cols-3 gap-4">
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
                  value={formData.price}
                  onChange={(e) =>
                    handleChange("price", Number(e.target.value))
                  }
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
            </div>

            {/* Supplier Section */}
            <div className="border-t border-gray-200 pt-4">
              <label className="block text-gray-700 mb-2">
                공급상 정보
              </label>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-600 text-sm mb-1">
                    공급상 이름
                  </label>
                  <input
                    type="text"
                    value={formData.supplier?.name || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        supplier: {
                          name: e.target.value,
                          url: prev.supplier?.url || "",
                        },
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="공급상 이름"
                  />
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