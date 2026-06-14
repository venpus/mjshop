import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createShopOrderFromInbound } from '../../api/shopOrderApi';
import type { InventoryListItem } from './types';

interface InventoryRegisterToOrderButtonProps {
  item: InventoryListItem;
  className?: string;
}

export function InventoryRegisterToOrderButton({
  item,
  className = '',
}: InventoryRegisterToOrderButtonProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const stockInboundItemId = parseInt(item.id, 10);
      if (Number.isNaN(stockInboundItemId)) {
        throw new Error('입고 항목 ID가 올바르지 않습니다.');
      }

      const { order, created } = await createShopOrderFromInbound(stockInboundItemId);

      if (!created) {
        alert('이미 주문 관리에 등록된 제품입니다. 상세 페이지로 이동합니다.');
      }

      navigate(`/admin/orders/${order.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : '주문 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isSubmitting}
      className={`p-2 rounded-lg bg-white/90 shadow-sm border border-gray-200 text-gray-600 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors disabled:opacity-50 ${className}`}
      title="주문관리에 등록하기"
      aria-label="주문관리에 등록하기"
    >
      <ShoppingCart className="w-4 h-4" />
    </button>
  );
}
