import { useState, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  product: string;
  unitPrice: number;
  quantity: number;
}

interface ReorderData {
  quantity: number;
  unit_price?: number;
  order_date?: string;
  estimated_shipment_date?: string;
}

interface UseReorderPurchaseOrderOptions {
  onSuccess?: (newOrderId: string) => void; // 새로 생성된 발주 ID 전달
}

interface UseReorderPurchaseOrderReturn {
  reorderOrder: PurchaseOrder | null;
  isReorderLoading: boolean;
  reorderError: string | null;
  openReorder: (order: PurchaseOrder) => void;
  closeReorder: () => void;
  handleConfirmReorder: (reorderData: ReorderData) => Promise<void>;
}

export function useReorderPurchaseOrder(
  options: UseReorderPurchaseOrderOptions = {}
): UseReorderPurchaseOrderReturn {
  const { onSuccess } = options;
  const [reorderOrder, setReorderOrder] = useState<PurchaseOrder | null>(null);
  const [isReorderLoading, setIsReorderLoading] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);

  const openReorder = useCallback((order: PurchaseOrder) => {
    setReorderOrder(order);
    setReorderError(null);
  }, []);

  const closeReorder = useCallback(() => {
    setReorderOrder(null);
    setReorderError(null);
  }, []);

  const handleConfirmReorder = useCallback(async (reorderData: ReorderData) => {
    if (!reorderOrder) return;

    setIsReorderLoading(true);
    setReorderError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders/${reorderOrder.id}/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(reorderData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '재주문 생성에 실패했습니다.');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || '재주문 생성에 실패했습니다.');
      }

      // 새로 생성된 발주 ID 추출
      const newOrderId = data.data?.id || data.data?.id?.toString();
      if (!newOrderId) {
        throw new Error('재주문된 발주 ID를 받지 못했습니다.');
      }

      // 성공 메시지
      alert('재주문이 성공적으로 생성되었습니다.');

      // 모달 닫기
      closeReorder();

      // 성공 콜백 호출 (새 발주 ID와 함께)
      if (onSuccess) {
        onSuccess(newOrderId);
      }
    } catch (err: any) {
      const errorMessage = err.message || '재주문 생성 중 오류가 발생했습니다.';
      setReorderError(errorMessage);
      alert(errorMessage);
      console.error('재주문 오류:', err);
    } finally {
      setIsReorderLoading(false);
    }
  }, [reorderOrder, closeReorder, onSuccess]);

  return {
    reorderOrder,
    isReorderLoading,
    reorderError,
    openReorder,
    closeReorder,
    handleConfirmReorder,
  };
}

