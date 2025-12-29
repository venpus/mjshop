import { useState, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  product?: {
    id: string | null;
    name: string;
    name_chinese: string | null;
    main_image: string | null;
    category?: string;
    size?: string | null;
    weight?: string | null;
  } | string;
}

interface UseDeletePurchaseOrderOptions {
  onSuccess?: () => void;
}

interface UseDeletePurchaseOrderReturn {
  deleteOrder: PurchaseOrder | null;
  isDeleting: boolean;
  deleteError: string | null;
  openDelete: (order: PurchaseOrder) => void;
  closeDelete: () => void;
  handleConfirmDelete: () => Promise<void>;
}

export function useDeletePurchaseOrder(
  options: UseDeletePurchaseOrderOptions = {}
): UseDeletePurchaseOrderReturn {
  const { onSuccess } = options;
  const [deleteOrder, setDeleteOrder] = useState<PurchaseOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openDelete = useCallback((order: PurchaseOrder) => {
    setDeleteOrder(order);
    setDeleteError(null);
  }, []);

  const closeDelete = useCallback(() => {
    setDeleteOrder(null);
    setDeleteError(null);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteOrder) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders/${deleteOrder.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '발주 삭제에 실패했습니다.');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || '발주 삭제에 실패했습니다.');
      }

      // 성공 메시지
      alert('발주가 성공적으로 삭제되었습니다.');

      // 모달 닫기
      closeDelete();

      // 성공 콜백 호출 (목록 새로고침 등)
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      const errorMessage = err.message || '발주 삭제 중 오류가 발생했습니다.';
      setDeleteError(errorMessage);
      alert(errorMessage);
      console.error('발주 삭제 오류:', err);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteOrder, closeDelete, onSuccess]);

  return {
    deleteOrder,
    isDeleting,
    deleteError,
    openDelete,
    closeDelete,
    handleConfirmDelete,
  };
}

