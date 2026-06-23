import { useState, useEffect, useMemo } from "react";
import { X, Upload } from "lucide-react";
import {
  computeProductFinalUnitCost,
  computeLogisticsCostFromWeight,
  convertFinalUnitCostToKrw,
} from "../utils/productCostCalculations";

interface ProductFormProps {
  onClose: () => void;
  onSave: (product: ProductFormDataWithFiles) => void;
  initialData?: ProductFormData;
  mode?: "create" | "edit";
}

export interface ProductFormData {
  price: number | "";
  logisticsCost: number | "";
  hasTag: boolean;
  stock: number | "";
  size: string;
  packagingSize: string;
  setCount: number;
  weight?: string;
  reorderMoq: number | "";
  deliveryDate: string;
  tagAddonEnabled: boolean;
  tagAddonPrice: number | "";
  packagingAddonEnabled: boolean;
  packagingAddonPrice: number | "";
  laborCost: number | "";
  existingImageUrls?: string[];
}

export interface ProductFormDataWithFiles extends ProductFormData {
  images?: File[];
}

const MAX_IMAGES = 20;

const DEFAULT_FORM_DATA: ProductFormData = {
  price: "",
  logisticsCost: "",
  hasTag: false,
  stock: "",
  size: "",
  packagingSize: "",
  setCount: 1,
  weight: "",
  reorderMoq: "",
  deliveryDate: "",
  tagAddonEnabled: false,
  tagAddonPrice: "",
  packagingAddonEnabled: false,
  packagingAddonPrice: "",
  laborCost: "",
};

const numberInputClass =
  "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export function ProductForm({
  onClose,
  onSave,
  initialData,
  mode = "create",
}: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>(
    initialData || DEFAULT_FORM_DATA
  );

  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);

  const totalImageCount = existingImageUrls.length + newImages.length;

  const finalUnitCost = useMemo(() => {
    if (formData.price === "") return null;
    return computeProductFinalUnitCost({
      price: Number(formData.price) || 0,
      logisticsCost:
        formData.logisticsCost === "" ? 0 : Number(formData.logisticsCost) || 0,
      tagAddonEnabled: formData.tagAddonEnabled,
      tagAddonPrice:
        formData.tagAddonPrice === "" ? null : Number(formData.tagAddonPrice),
      packagingAddonEnabled: formData.packagingAddonEnabled,
      packagingAddonPrice:
        formData.packagingAddonPrice === ""
          ? null
          : Number(formData.packagingAddonPrice),
      laborCost: formData.laborCost === "" ? 0 : Number(formData.laborCost) || 0,
    });
  }, [formData]);

  const finalUnitCostKrw =
    finalUnitCost != null ? convertFinalUnitCostToKrw(finalUnitCost) : null;

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      if (initialData.existingImageUrls) {
        setExistingImageUrls(initialData.existingImageUrls);
      }
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "create" && totalImageCount === 0) {
      alert("이미지를 1장 이상 등록해주세요.");
      return;
    }

    onSave({
      ...formData,
      images: newImages.length > 0 ? newImages : undefined,
      existingImageUrls:
        existingImageUrls.length > 0 ? existingImageUrls : undefined,
    });
  };

  const handleChange = (
    field: keyof ProductFormData,
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (
    field: keyof Pick<
      ProductFormData,
      | "price"
      | "logisticsCost"
      | "stock"
      | "reorderMoq"
      | "tagAddonPrice"
      | "packagingAddonPrice"
      | "laborCost"
    >,
    value: string
  ) => {
    handleChange(field, value === "" ? "" : Number(value));
  };

  const handleWeightChange = (value: string) => {
    setFormData((prev) => {
      const next: ProductFormData = { ...prev, weight: value };
      const trimmed = value.trim();
      if (trimmed === "") {
        return next;
      }

      const weightGrams = parseFloat(trimmed);
      const logisticsCost = computeLogisticsCostFromWeight(weightGrams);
      if (logisticsCost !== null) {
        next.logisticsCost = logisticsCost;
      }
      return next;
    });
  };

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remainingSlots = MAX_IMAGES - totalImageCount;
    const filesToAdd = files.slice(0, remainingSlots);

    if (filesToAdd.length > 0) {
      setNewImages((prev) => [...prev, ...filesToAdd]);
      filesToAdd.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setNewImagePreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }

    e.target.value = "";
  };

  const removeImage = (index: number) => {
    if (index < existingImageUrls.length) {
      setExistingImageUrls((prev) => prev.filter((_, i) => i !== index));
    } else {
      const fileIndex = index - existingImageUrls.length;
      setNewImages((prev) => prev.filter((_, i) => i !== fileIndex));
      setNewImagePreviews((prev) => prev.filter((_, i) => i !== fileIndex));
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h3 className="text-gray-900">{mode === "edit" ? "상품 수정" : "상품 등록"}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">
                이미지 {mode === "create" && <span className="text-red-500">*</span>}
              </label>
              <div className="grid grid-cols-6 gap-2">
                {existingImageUrls.map((url, index) => (
                  <div key={`existing-${index}`} className="relative border rounded-lg aspect-square bg-gray-50">
                    <img src={url} alt="" className="w-full h-full object-contain" />
                    <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {newImagePreviews.map((preview, index) => (
                  <div key={`new-${index}`} className="relative border rounded-lg aspect-square bg-gray-50">
                    <img src={preview} alt="" className="w-full h-full object-contain" />
                    <button type="button" onClick={() => removeImage(existingImageUrls.length + index)} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {totalImageCount < MAX_IMAGES && (
                  <label className="border-2 border-dashed border-gray-300 rounded-lg cursor-pointer aspect-square flex flex-col items-center justify-center hover:border-purple-400 hover:bg-purple-50 transition-colors">
                    <input type="file" accept="image/*" multiple onChange={handleImagesChange} className="hidden" />
                    <Upload className="w-6 h-6 text-gray-400 mb-1" />
                    <p className="text-gray-400 text-xs">{totalImageCount}/{MAX_IMAGES}</p>
                  </label>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">원가 · 비용</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">제품 원가 (¥) <span className="text-red-500">*</span></label>
                  <input type="number" required min="0" step="0.01" value={formData.price === "" ? "" : formData.price} onChange={(e) => handleNumberChange("price", e.target.value)} className={numberInputClass} />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">물류비 (¥)</label>
                  <input type="number" min="0" step="0.01" value={formData.logisticsCost === "" ? "" : formData.logisticsCost} onChange={(e) => handleNumberChange("logisticsCost", e.target.value)} className={numberInputClass} placeholder="중량 입력 시 자동 계산" />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">인건비 (¥)</label>
                  <input type="number" min="0" step="0.01" value={formData.laborCost === "" ? "" : formData.laborCost} onChange={(e) => handleNumberChange("laborCost", e.target.value)} className={numberInputClass} />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-gray-700 mb-2">최종 원가</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">위안화 (¥)</p>
                      <input
                        type="text"
                        readOnly
                        value={
                          finalUnitCost != null ? finalUnitCost.toLocaleString() : ""
                        }
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
                        placeholder="자동 계산"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">한화 (₩, ×225)</p>
                      <input
                        type="text"
                        readOnly
                        value={
                          finalUnitCostKrw != null
                            ? finalUnitCostKrw.toLocaleString()
                            : ""
                        }
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
                        placeholder="자동 계산"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <label className="inline-flex items-center gap-2 text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={formData.hasTag} onChange={(e) => handleChange("hasTag", e.target.checked)} className="w-4 h-4 text-purple-600 border-gray-300 rounded" />
                  택 유무
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-end gap-3">
                    <label className="inline-flex items-center gap-2 text-gray-700 cursor-pointer shrink-0 pb-2">
                      <input type="checkbox" checked={formData.tagAddonEnabled} onChange={(e) => handleChange("tagAddonEnabled", e.target.checked)} className="w-4 h-4 text-purple-600 border-gray-300 rounded" />
                      택 추가
                    </label>
                    <input type="number" min="0" step="0.01" disabled={!formData.tagAddonEnabled} value={formData.tagAddonPrice === "" ? "" : formData.tagAddonPrice} onChange={(e) => handleNumberChange("tagAddonPrice", e.target.value)} className={`${numberInputClass} disabled:bg-gray-100`} placeholder="택 추가 비용 (¥)" />
                  </div>
                  <div className="flex items-end gap-3">
                    <label className="inline-flex items-center gap-2 text-gray-700 cursor-pointer shrink-0 pb-2">
                      <input type="checkbox" checked={formData.packagingAddonEnabled} onChange={(e) => handleChange("packagingAddonEnabled", e.target.checked)} className="w-4 h-4 text-purple-600 border-gray-300 rounded" />
                      포장 추가
                    </label>
                    <input type="number" min="0" step="0.01" disabled={!formData.packagingAddonEnabled} value={formData.packagingAddonPrice === "" ? "" : formData.packagingAddonPrice} onChange={(e) => handleNumberChange("packagingAddonPrice", e.target.value)} className={`${numberInputClass} disabled:bg-gray-100`} placeholder="포장 추가 비용 (¥)" />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">규격 · 재고 · 납기</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">제품 사이즈 (cm)</label>
                  <input type="text" value={formData.size} onChange={(e) => handleChange("size", e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">중량 (g)</label>
                  <input type="text" inputMode="decimal" value={formData.weight || ""} onChange={(e) => handleWeightChange(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="입력 시 물류비 자동 계산" />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">박스 사이즈</label>
                  <input type="text" value={formData.packagingSize} onChange={(e) => handleChange("packagingSize", e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">재고 수량</label>
                  <input type="number" min="0" value={formData.stock === "" ? "" : formData.stock} onChange={(e) => handleNumberChange("stock", e.target.value)} className={numberInputClass} />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">2차 주문 MOQ</label>
                  <input type="number" min="0" value={formData.reorderMoq === "" ? "" : formData.reorderMoq} onChange={(e) => handleNumberChange("reorderMoq", e.target.value)} className={numberInputClass} />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">납기일</label>
                  <input
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => handleChange("deliveryDate", e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">세트 모델수(개) <span className="text-red-500">*</span></label>
                  <input type="number" required min="1" value={formData.setCount} onChange={(e) => handleChange("setCount", Number(e.target.value))} className={numberInputClass} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">취소</button>
            <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">{mode === "edit" ? "수정하기" : "등록하기"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
