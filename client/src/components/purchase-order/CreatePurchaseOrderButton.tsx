import { useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PurchaseOrderForm, PurchaseOrderFormData } from "../PurchaseOrderForm";
import { useAuth } from "../../contexts/AuthContext";

interface CreatePurchaseOrderButtonProps {
  className?: string;
  variant?: "default" | "outline";
}

/**
 * 발주 생성 버튼 컴포넌트
 * 클릭 시 발주 생성 모달을 표시합니다.
 */
export function CreatePurchaseOrderButton({
  className = "",
  variant = "default",
}: CreatePurchaseOrderButtonProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  const handleCreate = () => {
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
  };

  const handleSave = async (formData: PurchaseOrderFormData, mainImageFile?: File) => {
    try {
      // 발주 생성 API 호출
      // 한국어 또는 중국어 상품명 중 하나는 필수이므로, 둘 중 하나를 product_name으로 사용
      const finalProductName = formData.product_name || formData.product_name_chinese || '';
      const finalProductNameChinese = formData.product_name_chinese || undefined;
      
      const createData: any = {
        product_name: finalProductName,
        product_name_chinese: formData.product_name && formData.product_name_chinese ? finalProductNameChinese : undefined,
        product_category: formData.product_category || '봉제',
        product_size: formData.product_size || undefined,
        product_weight: formData.product_weight || undefined,
        product_set_count: formData.product_set_count || 1,
        unit_price: formData.unit_price,
        order_unit_price: formData.order_unit_price || undefined,
        quantity: formData.quantity,
        order_date: formData.order_date || null,
        estimated_shipment_date: formData.estimated_shipment_date || null,
        created_by: user?.id || undefined,
      };

      const createResponse = await fetch(`${API_BASE_URL}/purchase-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(createData),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({}));
        throw new Error(errorData.error || '발주 생성에 실패했습니다.');
      }

      const createResult = await createResponse.json();
      const savedOrderId = createResult.data.id;

      // 메인 이미지가 있는 경우 업로드 (업로드 완료 후 페이지 이동)
      if (mainImageFile && savedOrderId) {
        const formDataToUpload = new FormData();
        formDataToUpload.append('mainImage', mainImageFile);

        try {
          const imageResponse = await fetch(`${API_BASE_URL}/purchase-orders/${savedOrderId}/main-image`, {
            method: 'POST',
            credentials: 'include',
            body: formDataToUpload,
          });

          if (!imageResponse.ok) {
            const errorData = await imageResponse.json().catch(() => ({}));
            console.error('이미지 업로드 실패:', errorData.error || '이미지 업로드에 실패했습니다.');
            // 이미지 업로드 실패해도 발주는 생성되었으므로 계속 진행
          } else {
            const imageResult = await imageResponse.json();
            console.log('[CreatePurchaseOrderButton] 이미지 업로드 성공:', imageResult);
          }
        } catch (imageError) {
          console.error('이미지 업로드 중 오류:', imageError);
          // 이미지 업로드 실패해도 발주는 생성되었으므로 계속 진행
        }
      }

      // 성공 메시지
      alert('발주가 성공적으로 생성되었습니다.');
      
      // 모달 닫기
      setIsModalOpen(false);
      
      // 발주 상세 페이지로 이동 (이미지 업로드 완료 후)
      navigate(`/admin/purchase-orders/${savedOrderId}`);
    } catch (error: any) {
      console.error('발주 생성 오류:', error);
      throw error;
    }
  };

  const baseClasses = "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors";
  
  const variantClasses =
    variant === "outline"
      ? "border border-purple-600 text-purple-600 hover:bg-purple-50"
      : "bg-purple-600 text-white hover:bg-purple-700";

  return (
    <>
      <button
        onClick={handleCreate}
        className={`${baseClasses} ${variantClasses} ${className}`}
      >
        <Plus className="w-5 h-5" />
        <span>발주 생성</span>
      </button>
      
      {isModalOpen && (
        <PurchaseOrderForm
          onClose={handleClose}
          onSave={handleSave}
        />
      )}
    </>
  );
}

