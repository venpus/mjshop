import { useState, useRef, useEffect } from "react";
import { X, UploadCloud } from "lucide-react";
import { ProductInfoInput, ProductInfoInputData } from "./purchase-order/ProductInfoInput";

interface PurchaseOrderFormProps {
  onClose: () => void;
  onSave: (formData: PurchaseOrderFormData, mainImageFile?: File) => Promise<void>;
  initialMainImageUrl?: string; // 초기 메인 이미지 URL (부자재 테스트 이미지에서 발주 생성 시 사용)
}

export interface PurchaseOrderFormData {
  // 상품 정보
  product_name: string;
  product_name_chinese?: string;
  product_category?: string;
  product_size?: string;
  product_weight?: string;
  product_set_count?: number;
  // 발주 정보
  unit_price: number;
  order_unit_price?: number;
  quantity: number;
  order_date?: string;
  estimated_shipment_date?: string; // 예상 출고일
}

export function PurchaseOrderForm({
  onClose,
  onSave,
  initialMainImageUrl,
}: PurchaseOrderFormProps) {
  const [productInfo, setProductInfo] = useState<ProductInfoInputData>({
    product_name: "",
    product_name_chinese: "",
    product_category: "봉제",
    product_main_image: "", // URL은 더 이상 사용하지 않지만 ProductInfoInputData 인터페이스 유지
    product_size: "",
    product_weight: "",
    product_packaging_size: "", // 인터페이스에서는 유지하지만 UI에서는 표시하지 않음
    product_set_count: undefined as any,
    product_small_pack_count: 1, // 인터페이스에서는 유지하지만 UI에서는 표시하지 않음
    product_box_count: 1, // 인터페이스에서는 유지하지만 UI에서는 표시하지 않음
  });

  const [formData, setFormData] = useState<Omit<PurchaseOrderFormData, keyof ProductInfoInputData>>({
    unit_price: undefined as any,
    quantity: undefined as any,
    order_date: new Date().toISOString().split("T")[0], // 오늘 날짜
    estimated_shipment_date: "",
  });

  // 메인 이미지 파일 업로드 관련 상태
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string>(initialMainImageUrl || "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialImageLoadedRef = useRef(false);

  // initialMainImageUrl이 있으면 미리보기로 표시 (한 번만 실행)
  useEffect(() => {
    if (initialMainImageUrl && !isInitialImageLoadedRef.current) {
      setMainImagePreview(initialMainImageUrl);
      isInitialImageLoadedRef.current = true;
    }
  }, [initialMainImageUrl]);

  const [errors, setErrors] = useState<Partial<Record<keyof PurchaseOrderFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleProductInfoChange = (data: ProductInfoInputData) => {
    setProductInfo(data);
    // 에러 초기화
    if (errors.product_name) {
      setErrors((prev) => ({ ...prev, product_name: undefined }));
    }
  };

  const handleChange = (
    field: keyof Omit<PurchaseOrderFormData, keyof ProductInfoInputData>,
    value: string | number | undefined
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // 에러 초기화
    if (errors[field as keyof PurchaseOrderFormData]) {
      setErrors((prev) => ({ ...prev, [field as keyof PurchaseOrderFormData]: undefined }));
    }
  };

  // 메인 이미지 파일 선택 핸들러
  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 이미지 파일인지 확인
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드할 수 있습니다.');
        return;
      }
      setMainImageFile(file);
      // 미리보기 URL 생성
      const previewUrl = URL.createObjectURL(file);
      setMainImagePreview(previewUrl);
    }
  };

  // 메인 이미지 제거 핸들러
  const handleRemoveMainImage = () => {
    // File 객체로부터 생성된 URL만 revoke (initialMainImageUrl은 revoke하지 않음)
    if (mainImagePreview && mainImageFile) {
      URL.revokeObjectURL(mainImagePreview);
    }
    setMainImageFile(null);
    setMainImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 유효성 검사
    const newErrors: Partial<Record<keyof PurchaseOrderFormData, string>> = {};

    // 한국어 또는 중국어 상품명 중 하나는 필수
    if ((!productInfo.product_name || productInfo.product_name.trim() === "") && 
        (!productInfo.product_name_chinese || productInfo.product_name_chinese.trim() === "")) {
      newErrors.product_name = "한국어 또는 중국어 상품명 중 하나를 입력해주세요";
    }
    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = "수량을 입력해주세요 (1 이상)";
    }
    if (!formData.unit_price || formData.unit_price <= 0) {
      newErrors.unit_price = "단가를 입력해주세요 (0보다 큰 값)";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData: PurchaseOrderFormData = {
        product_name: productInfo.product_name || '',
        product_name_chinese: productInfo.product_name_chinese || undefined,
        product_category: productInfo.product_category,
        product_size: productInfo.product_size || undefined,
        product_weight: productInfo.product_weight || undefined,
        product_set_count: productInfo.product_set_count,
        ...formData,
      };
      await onSave(submitData, mainImageFile || undefined);
      // 성공 시 모달은 onSave에서 닫히거나 부모 컴포넌트에서 처리
    } catch (error: any) {
      alert(error.message || "발주 생성 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h3 className="text-xl font-semibold text-gray-900">발주 생성</h3>
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
            {/* 상품 정보 입력 */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">상품 정보</h4>
              
              {/* 메인 이미지 업로드 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  메인 이미지
                </label>
                <div className="flex items-center gap-4">
                  <div
                    className="w-32 h-32 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer border-2 border-dashed border-gray-300 hover:border-purple-500 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {mainImagePreview ? (
                      <img
                        src={mainImagePreview}
                        alt="메인 이미지 미리보기"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-gray-400">
                        <UploadCloud className="w-8 h-8 mb-1" />
                        <span className="text-xs">업로드</span>
                      </div>
                    )}
                  </div>
                  {mainImagePreview && (
                    <button
                      type="button"
                      onClick={handleRemoveMainImage}
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      제거
                    </button>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleMainImageChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>

              <ProductInfoInput
                data={productInfo}
                onChange={handleProductInfoChange}
                errors={errors}
                hideMainImage={true}
              />
            </div>

            {/* 발주 정보 입력 */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-700">발주 정보</h4>

              {/* 수량, 단가 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    수량 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => handleChange("quantity", parseInt(e.target.value) || 0)}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.quantity ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.quantity && (
                    <p className="mt-1 text-xs text-red-500">{errors.quantity}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    단가 (¥) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.unit_price ?? ''}
                    onChange={(e) => handleChange("unit_price", e.target.value === '' ? undefined : parseFloat(e.target.value) || undefined)}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.unit_price ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.unit_price && (
                    <p className="mt-1 text-xs text-red-500">{errors.unit_price}</p>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-gray-200 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              disabled={isSubmitting}
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? "생성 중..." : "발주 생성"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
