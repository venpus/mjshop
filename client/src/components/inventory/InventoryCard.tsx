import { FileText, Image } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InventoryRegisterToOrderButton } from './InventoryRegisterToOrderButton';
import type { InventoryListItem } from './types';

interface InventoryCardProps {
  item: InventoryListItem;
  onCardClick?: (item: InventoryListItem) => void;
}

export function InventoryCard({ item, onCardClick }: InventoryCardProps) {
  const navigate = useNavigate();

  const handlePurchaseOrderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.purchaseOrderId) return;
    navigate(`/admin/purchase-orders/${item.purchaseOrderId}`);
  };

  const handleCardClick = () => {
    onCardClick?.(item);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md hover:border-purple-200 transition-all flex flex-col text-left cursor-pointer relative"
    >
      <div className="w-full aspect-square bg-gray-100 flex items-center justify-center overflow-hidden relative">
        {item.productImage ? (
          <img
            src={item.productImage}
            alt={item.productName}
            className="w-full h-full object-cover"
          />
        ) : (
          <Image className="w-10 h-10 text-gray-400" />
        )}

        <div className="absolute top-2 right-2 flex flex-col gap-1.5">
          <InventoryRegisterToOrderButton item={item} />
          {item.purchaseOrderId && (
            <button
              type="button"
              onClick={handlePurchaseOrderClick}
              className="p-2 rounded-lg bg-white/90 shadow-sm border border-gray-200 text-gray-600 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-colors"
              title="주문관리로 바로가기"
              aria-label="주문관리로 바로가기"
            >
              <FileText className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug pr-1">
          {item.productName}
        </h3>

        <div className="mt-auto space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">수량</span>
            <span className="text-sm font-semibold text-gray-900">
              {item.inboundQuantity.toLocaleString()}개
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">재고 수량</span>
            <span className="text-sm font-semibold text-blue-700">
              {item.stockQuantity.toLocaleString()}개
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
