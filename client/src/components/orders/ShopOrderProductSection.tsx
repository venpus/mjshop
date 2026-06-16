import { useMemo, type ReactNode } from 'react';
import { Package, Image, ExternalLink } from 'lucide-react';
import { getFullImageUrl } from '../../api/purchaseOrderApi';
import { handleNumberInputWheel } from '../../utils/preventNumberInputWheel';
import type { ShopOrderStatus } from '../../api/shopOrderApi';
import { getShopOrderStatusClass } from '../../api/shopOrderApi';

interface ShopOrderProductSectionProps {
  productName: string;
  orderNumber: string;
  productImage?: string;
  orderQuantity: number;
  warehouseStockQuantity: number;
  remainingStockQuantity: number;
  sellingPrice: number | null;
  quantityPerBox: number;
  unitPrice: number | null;
  orderDate: string;
  status: ShopOrderStatus;
  purchaseOrderId?: string | null;
  onImageClick?: () => void;
  onPurchaseOrderClick?: () => void;
  onWarehouseStockQuantityChange?: (value: number) => void;
  onUnitPriceChange?: (value: number | null) => void;
  onSellingPriceChange?: (value: number | null) => void;
  onQuantityPerBoxChange?: (value: number) => void;
}

const inputClass =
  'w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-right';

function InfoField({
  label,
  className = 'min-w-[72px]',
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex flex-col shrink-0 ${className}`}>
      <span className="text-xs text-gray-500 mb-0.5 whitespace-nowrap">{label}</span>
      {children}
    </div>
  );
}

export function ShopOrderProductSection({
  productName,
  orderNumber,
  productImage,
  orderQuantity,
  warehouseStockQuantity,
  remainingStockQuantity,
  sellingPrice,
  quantityPerBox,
  unitPrice,
  orderDate,
  status,
  purchaseOrderId,
  onImageClick,
  onPurchaseOrderClick,
  onWarehouseStockQuantityChange,
  onUnitPriceChange,
  onSellingPriceChange,
  onQuantityPerBoxChange,
}: ShopOrderProductSectionProps) {
  const imageUrl = useMemo(() => {
    if (!productImage) return '';
    const full = productImage.startsWith('http') ? productImage : getFullImageUrl(productImage);
    const base = full.split(/[?&]_t=/)[0];
    return `${base}${base.includes('?') ? '&' : '?'}_t=${Date.now()}`;
  }, [productImage]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-4">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-1.5 rounded-lg border border-blue-200 min-w-0 flex-1">
          <Package className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="text-sm md:text-base font-bold text-gray-900 truncate">
            {productName || '(상품명 없음)'}{' '}
            <span className="select-text cursor-text font-mono">({orderNumber})</span>
          </span>
        </div>

        {purchaseOrderId && onPurchaseOrderClick && (
          <button
            type="button"
            onClick={onPurchaseOrderClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md border border-purple-200 transition-colors text-xs shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="font-medium whitespace-nowrap">연결 발주</span>
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative shrink-0">
          <div
            className={`w-24 h-24 md:w-32 md:h-32 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center ${
              productImage ? 'cursor-pointer hover:opacity-90' : ''
            }`}
            onClick={productImage ? onImageClick : undefined}
            onKeyDown={productImage ? (e) => e.key === 'Enter' && onImageClick?.() : undefined}
            role={productImage ? 'button' : undefined}
            tabIndex={productImage ? 0 : undefined}
          >
            {productImage ? (
              <img src={imageUrl} alt={productName} className="w-full h-full object-cover" />
            ) : (
              <Image className="w-10 h-10 text-gray-400" />
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 overflow-x-auto pb-0.5">
          <div className="flex flex-nowrap items-end gap-x-3 gap-y-2 min-w-max">
            <InfoField label="전체 수량" className="w-[80px]">
              <input
                type="number"
                min={0}
                step={1}
                value={warehouseStockQuantity}
                onChange={(e) =>
                  onWarehouseStockQuantityChange?.(parseInt(e.target.value, 10) || 0)
                }
                onWheel={handleNumberInputWheel}
                className={inputClass}
                title="창고 보유 전체 수량"
              />
            </InfoField>

            <InfoField label="주문 수량" className="w-[72px]">
              <span className="text-sm font-semibold text-gray-900 tabular-nums">
                {orderQuantity.toLocaleString()}개
              </span>
            </InfoField>

            <InfoField label="재고 수량" className="w-[72px]">
              <span
                className={`text-sm font-semibold tabular-nums ${
                  remainingStockQuantity < 0 ? 'text-red-600' : 'text-blue-700'
                }`}
                title="전체 수량 − 주문 수량"
              >
                {remainingStockQuantity.toLocaleString()}개
              </span>
            </InfoField>

            <InfoField label="한박스 입수량" className="w-[80px]">
              <input
                type="number"
                min={0}
                value={quantityPerBox}
                onChange={(e) =>
                  onQuantityPerBoxChange?.(parseInt(e.target.value, 10) || 0)
                }
                onWheel={handleNumberInputWheel}
                className={inputClass}
              />
            </InfoField>

            <InfoField label="판매가 (₩)" className="w-[96px]">
              <input
                type="number"
                min={0}
                value={sellingPrice ?? ''}
                onChange={(e) =>
                  onSellingPriceChange?.(
                    e.target.value === '' ? null : parseFloat(e.target.value) || 0
                  )
                }
                onWheel={handleNumberInputWheel}
                className={inputClass}
                placeholder="판매가"
              />
            </InfoField>

            <InfoField label="원가 단가 (¥)" className="w-[88px]">
              <input
                type="number"
                min={0}
                step="0.01"
                value={unitPrice ?? ''}
                onChange={(e) =>
                  onUnitPriceChange?.(
                    e.target.value === '' ? null : parseFloat(e.target.value) || 0
                  )
                }
                onWheel={handleNumberInputWheel}
                className={inputClass}
                placeholder="원가"
              />
            </InfoField>

            <InfoField label="등록일" className="w-[88px]">
              <span className="text-sm text-gray-900 whitespace-nowrap">{orderDate || '-'}</span>
            </InfoField>

            <InfoField label="판매 상태" className="w-[72px]">
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getShopOrderStatusClass(status)}`}
              >
                {status}
              </span>
            </InfoField>
          </div>
        </div>
      </div>
    </div>
  );
}
