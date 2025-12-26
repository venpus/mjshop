import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface Product {
  id: string;
  name: string;
  nameChinese?: string;
  category: string;
  price: number;
  size: string;
  weight: string;
  supplier: {
    name: string;
    url: string;
  };
}

interface PurchaseOrderFormProps {
  product: Product;
  onClose: () => void;
  onSave: (formData: PurchaseOrderFormData) => Promise<void>;
}

export interface PurchaseOrderFormData {
  product_id: string;
  supplier_id?: number; // API에서 supplier.name으로 조회하여 설정
  unit_price: number;
  order_unit_price?: number;
  quantity: number;
  size?: string;
  weight?: string;
  packaging?: number;
  order_date?: string;
  estimated_shipment_date?: string; // 예상 출고일
}

export function PurchaseOrderForm({
  product,
  onClose,
  onSave,
}: PurchaseOrderFormProps) {
  const [formData, setFormData] = useState<PurchaseOrderFormData>({
    product_id: product.id,
    unit_price: product.price,
    quantity: 1,
    size: product.size || "",
    weight: product.weight || "",
    order_date: new Date().toISOString().split("T")[0], // 오늘 날짜
    estimated_shipment_date: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof PurchaseOrderFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    field: keyof PurchaseOrderFormData,
    value: string | number | undefined
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // 에러 초기화
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 유효성 검사
    const newErrors: Partial<Record<keyof PurchaseOrderFormData, string>> = {};

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
      await onSave(formData);
      // 성공 시 모달은 onSave에서 닫히거나 부모 컴포넌트에서 처리
    } catch (error: any) {
      alert(error.message || "발주 생성 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
            {/* 상품 정보 (읽기 전용) */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">상품 정보</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">상품 ID</label>
                  <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
                    {product.id}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">카테고리</label>
                  <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
                    {product.category}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-600 mb-1">상품명</label>
                  <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
                    {product.name}
                    {product.nameChinese && (
                      <span className="text-gray-600"> ({product.nameChinese})</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 공급업체 정보 (읽기 전용) */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">공급업체 정보</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">공급업체명</label>
                  <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
                    {product.supplier.name}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">공급업체 URL</label>
                  <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
                    {product.supplier.url || "-"}
                  </div>
                </div>
              </div>
            </div>

            {/* 발주 정보 입력 */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-700">발주 정보</h4>

              {/* 수량, 단가, 발주단가 */}
              <div className="grid grid-cols-3 gap-4">
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
                    value={formData.unit_price}
                    onChange={(e) => handleChange("unit_price", parseFloat(e.target.value) || 0)}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.unit_price ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.unit_price && (
                    <p className="mt-1 text-xs text-red-500">{errors.unit_price}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    발주단가 (¥)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.order_unit_price || ""}
                    onChange={(e) =>
                      handleChange(
                        "order_unit_price",
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="선택사항"
                  />
                </div>
              </div>

              {/* 크기, 무게, 소포장 개수 */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">크기</label>
                  <input
                    type="text"
                    value={formData.size || ""}
                    onChange={(e) => handleChange("size", e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="예: 30x20x15cm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">무게</label>
                  <input
                    type="text"
                    value={formData.weight || ""}
                    onChange={(e) => handleChange("weight", e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="예: 500g"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    소포장 개수
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.packaging || ""}
                    onChange={(e) =>
                      handleChange(
                        "packaging",
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="선택사항"
                  />
                </div>
              </div>

              {/* 발주일, 예상 출고일 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">발주일</label>
                  <input
                    type="date"
                    value={formData.order_date || ""}
                    onChange={(e) => handleChange("order_date", e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    예상 출고일
                  </label>
                  <input
                    type="date"
                    value={formData.estimated_shipment_date || ""}
                    onChange={(e) => handleChange("estimated_shipment_date", e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="선택사항"
                  />
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

