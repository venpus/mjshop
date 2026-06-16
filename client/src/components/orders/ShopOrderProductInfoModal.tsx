import { useEffect } from 'react';
import { Image, Package, X } from 'lucide-react';
import type { ShopOrder } from '../../api/shopOrderApi';
import { getShopOrderStatusClass } from '../../api/shopOrderApi';
import { getFullImageUrl } from '../../api/purchaseOrderApi';

interface ShopOrderProductInfoModalProps {
  isOpen: boolean;
  order: ShopOrder | null;
  onClose: () => void;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 py-2 border-b border-gray-100 last:border-0">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900 break-words">{value || '-'}</dd>
    </div>
  );
}

export function ShopOrderProductInfoModal({ isOpen, order, onClose }: ShopOrderProductInfoModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const imageUrl = order.productMainImage
    ? order.productMainImage.startsWith('http')
      ? order.productMainImage
      : getFullImageUrl(order.productMainImage)
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-order-product-info-title"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2 min-w-0">
            <Package className="w-5 h-5 text-indigo-600 shrink-0" />
            <h3 id="shop-order-product-info-title" className="text-lg font-semibold text-gray-900 truncate">
              상품 정보
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg shrink-0"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4">
          <div className="flex flex-col sm:flex-row gap-4 mb-5">
            <div className="shrink-0 mx-auto sm:mx-0">
              <div className="w-28 h-28 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border border-gray-200">
                {imageUrl ? (
                  <img src={imageUrl} alt={order.productName} className="w-full h-full object-cover" />
                ) : (
                  <Image className="w-10 h-10 text-gray-400" />
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-gray-900">{order.productName || '-'}</p>
              <p className="text-sm text-gray-500 mt-1 font-mono">{order.orderNumber}</p>
              <span
                className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${getShopOrderStatusClass(order.status)}`}
              >
                {order.status}
              </span>
            </div>
          </div>

          <dl className="rounded-lg border border-gray-200 bg-gray-50/60 px-4 py-1">
            <InfoRow label="주문 수량" value={`${order.quantity.toLocaleString()}개`} />
            <InfoRow label="재고 수량" value={`${order.stockQuantity.toLocaleString()}개`} />
            <InfoRow
              label="창고 재고"
              value={`${order.warehouseStockQuantity.toLocaleString()}개`}
            />
            <InfoRow label="한박스 입수량" value={`${order.quantityPerBox.toLocaleString()}개`} />
            <InfoRow
              label="판매가"
              value={order.sellingPrice != null ? `₩${order.sellingPrice.toLocaleString()}` : '-'}
            />
            <InfoRow
              label="원가 단가"
              value={order.unitPrice != null ? `¥${order.unitPrice.toLocaleString()}` : '-'}
            />
            <InfoRow label="등록일" value={order.orderDate ?? '-'} />
            <InfoRow label="연결 발주 ID" value={order.purchaseOrderId ?? '-'} />
            <InfoRow label="메모" value={order.note ?? '-'} />
          </dl>
        </div>

        <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
