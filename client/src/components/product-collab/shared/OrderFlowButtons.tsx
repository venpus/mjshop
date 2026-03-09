import type { ProductCollabStatus } from '../types';

interface OrderFlowButtonsProps {
  productId: number;
  status: ProductCollabStatus;
  mainImageId: number | null;
  specFilled: boolean;
  onStatusChange: () => void;
}

export function OrderFlowButtons({
  productId,
  status,
  mainImageId,
  specFilled,
  onStatusChange,
}: OrderFlowButtonsProps) {
  const handleClick = async (newStatus: ProductCollabStatus) => {
    const { updateProduct } = await import('../../../api/productCollabApi');
    const res = await updateProduct(productId, { status: newStatus });
    if (res.success) onStatusChange();
  };

  /** 대표 이미지 + 스펙 입력 시 발주 확정 가능 */
  const canConfirmOrder = status !== 'COMPLETED' && mainImageId != null && specFilled;

  return (
    <div className="flex flex-wrap gap-2">
      {canConfirmOrder && (
        <button
          type="button"
          onClick={() => handleClick('COMPLETED')}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
        >
          발주 확정
        </button>
      )}
      {status === 'COMPLETED' && (
        <button
          type="button"
          onClick={() => handleClick('READY_FOR_ORDER')}
          className="px-4 py-2 text-sm font-medium text-[#1F2937] bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200"
        >
          발주 보류
        </button>
      )}
    </div>
  );
}
