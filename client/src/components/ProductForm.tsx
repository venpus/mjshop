import { useState, useEffect, useMemo } from "react";
import { Loader2, Star, Upload, X } from "lucide-react";
import {
  computeProductFinalUnitCost,
  computeLogisticsCostFromWeight,
  convertFinalUnitCostToKrw,
} from "../utils/productCostCalculations";
import {
  PRODUCT_FORM_KIND_OPTIONS,
  type ProductKind,
} from "../utils/productApiHelpers";

interface ProductFormProps {
  onClose: () => void;
  onSave: (product: ProductFormDataWithFiles) => void | Promise<void>;
  initialData?: ProductFormData;
  mode?: "create" | "edit";
}

export interface ProductFormData {
  productKind: ProductKind;
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
  /** 수정 시 메인이 신규 업로드 이미지인 경우 서버에 전달 */
  mainImageIsNew?: boolean;
}

type ImageItem =
  | { kind: "existing"; url: string }
  | { kind: "new"; file: File };

function orderImagesWithMainFirst(
  existingUrls: string[],
  newFiles: File[],
  mainIndex: number
): { existingImageUrls: string[]; images: File[]; mainImageIsNew: boolean } {
  const items: ImageItem[] = [
    ...existingUrls.map((url) => ({ kind: "existing" as const, url })),
    ...newFiles.map((file) => ({ kind: "new" as const, file })),
  ];
  if (items.length === 0) {
    return { existingImageUrls: [], images: [], mainImageIsNew: false };
  }
  const safeMain = Math.min(Math.max(0, mainIndex), items.length - 1);
  const mainItem = items[safeMain];
  const ordered = [mainItem, ...items.filter((_, i) => i !== safeMain)];
  return {
    existingImageUrls: ordered
      .filter((i): i is { kind: "existing"; url: string } => i.kind === "existing")
      .map((i) => i.url),
    images: ordered
      .filter((i): i is { kind: "new"; file: File } => i.kind === "new")
      .map((i) => i.file),
    mainImageIsNew: mainItem.kind === "new",
  };
}

const MAX_IMAGES = 20;

const DEFAULT_FORM_DATA: ProductFormData = {
  productKind: "판매가능",
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
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setMainImageIndex(0);
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (mode === "create" && totalImageCount === 0) {
      alert("이미지를 1장 이상 등록해주세요.");
      return;
    }

    const { existingImageUrls: orderedExisting, images: orderedImages, mainImageIsNew } =
      orderImagesWithMainFirst(existingImageUrls, newImages, mainImageIndex);

    setIsSubmitting(true);
    try {
      await onSave({
        ...formData,
        images: orderedImages.length > 0 ? orderedImages : undefined,
        existingImageUrls:
          orderedExisting.length > 0 ? orderedExisting : undefined,
        mainImageIsNew: totalImageCount > 0 ? mainImageIsNew : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
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
    setMainImageIndex((prev) => {
      if (index < prev) return prev - 1;
      if (index === prev) return 0;
      return prev;
    });

    if (index < existingImageUrls.length) {
      setExistingImageUrls((prev) => prev.filter((_, i) => i !== index));
    } else {
      const fileIndex = index - existingImageUrls.length;
      setNewImages((prev) => prev.filter((_, i) => i !== fileIndex));
      setNewImagePreviews((prev) => prev.filter((_, i) => i !== fileIndex));
    }
  };

  const renderImageTile = (src: string, globalIndex: number, key: string) => {
    const isMain = globalIndex === mainImageIndex;

    return (
      <div
        key={key}
        className={`relative flex flex-col border-2 rounded-lg aspect-square bg-gray-50 overflow-hidden ${
          isMain ? "border-orange-500 ring-2 ring-orange-200" : "border-gray-200"
        }`}
      >
        <img src={src} alt="" className="w-full h-full object-contain p-1" />
        {isMain && (
          <div className="absolute top-1 left-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-orange-500 text-white text-[9px] font-bold">
            <Star className="w-2.5 h-2.5 fill-current" />
            메인
          </div>
        )}
        {!isMain && totalImageCount > 1 && (
          <button
            type="button"
            onClick={() => setMainImageIndex(globalIndex)}
            disabled={isSubmitting}
            className="absolute bottom-1 left-1 right-1 py-0.5 text-[9px] font-medium bg-white/90 border border-gray-200 rounded text-gray-700 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700 disabled:opacity-50"
          >
            메인으로
          </button>
        )}
        <button
          type="button"
          onClick={() => removeImage(globalIndex)}
          disabled={isSubmitting}
          className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full disabled:opacity-50"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm z-[70] overflow-y-auto p-4">
      <div className="flex min-h-full items-center justify-center py-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
          <h3 className="text-gray-900">{mode === "edit" ? "상품 수정" : "상품 등록"}</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">
                상품 구분 <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {PRODUCT_FORM_KIND_OPTIONS.map((option) => {
                  const selected = formData.productKind === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleChange("productKind", option.value)}
                      className={`inline-flex flex-col items-start px-4 py-2.5 rounded-lg border-2 text-left transition-colors disabled:opacity-50 ${
                        selected
                          ? option.value === "재고조사"
                            ? "border-amber-500 bg-amber-50 text-amber-900"
                            : option.value === "예약판매"
                              ? "border-sky-500 bg-sky-50 text-sky-900"
                              : "border-emerald-500 bg-emerald-50 text-emerald-900"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <span className="text-sm font-bold">{option.label}</span>
                      <span className="text-xs opacity-80">{option.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-gray-700 mb-1">
                이미지 {mode === "create" && <span className="text-red-500">*</span>}
              </label>
              {totalImageCount > 0 && (
                <p className="text-xs text-gray-500 mb-2">메인으로 사용할 사진을 선택하세요</p>
              )}
              <div className="grid grid-cols-6 gap-2">
                {existingImageUrls.map((url, index) =>
                  renderImageTile(url, index, `existing-${index}`)
                )}
                {newImagePreviews.map((preview, index) =>
                  renderImageTile(
                    preview,
                    existingImageUrls.length + index,
                    `new-${index}`
                  )
                )}
                {totalImageCount < MAX_IMAGES && (
                  <label
                    className={`border-2 border-dashed border-gray-300 rounded-lg aspect-square flex flex-col items-center justify-center transition-colors ${
                      isSubmitting
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer hover:border-purple-400 hover:bg-purple-50"
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImagesChange}
                      disabled={isSubmitting}
                      className="hidden"
                    />
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
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-70 disabled:cursor-not-allowed min-w-[7rem] justify-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {mode === "edit" ? "수정 중…" : "등록 중…"}
                </>
              ) : (
                mode === "edit" ? "수정하기" : "등록하기"
              )}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
