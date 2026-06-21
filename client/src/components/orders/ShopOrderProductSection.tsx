import { useMemo, type ReactNode } from 'react';
import { Package, Image, ExternalLink } from 'lucide-react';
import { getFullImageUrl } from '../../api/purchaseOrderApi';
import { handleNumberInputWheel } from '../../utils/preventNumberInputWheel';
import type { ShopOrderStatus } from '../../api/shopOrderApi';
import { getShopOrderStatusClass } from '../../api/shopOrderApi';
import { SHOP_COST_EXCHANGE_RATE } from '../shop-tools/shopCostCalculator';

export type ShopOrderLogisticsDateField =
  | 'chinaInboundDate'
  | 'chinaOutboundDate'
  | 'koreaArrivalDate'
  | 'actualArrivalDate';

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
  initialExpectedUnitPrice: number | null;
  orderDate: string;
  chinaInboundDate: string;
  chinaOutboundDate: string;
  koreaArrivalDate: string;
  actualArrivalDate: string;
  purchaseOrderProductSize: string | null;
  purchaseOrderProductWeight: string | null;
  purchaseOrderProductPackagingSize: string | null;
  status: ShopOrderStatus;
  purchaseOrderId?: string | null;
  onImageClick?: () => void;
  onPurchaseOrderClick?: () => void;
  onWarehouseStockQuantityChange?: (value: number) => void;
  onUnitPriceChange?: (value: number | null) => void;
  onSellingPriceChange?: (value: number | null) => void;
  onQuantityPerBoxChange?: (value: number) => void;
  onLogisticsDateChange?: (field: ShopOrderLogisticsDateField, value: string) => void;
}

const inputClass =
  'w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-right';

const dateInputClass =
  'w-full px-1.5 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500';

function formatWeightDisplay(value: string | null | undefined): string {
  if (!value?.trim()) return '-';
  const trimmed = value.trim();
  if (/g|kg/i.test(trimmed)) return trimmed;
  return `${trimmed}g`;
}

function formatCnyAmount(value: number | null | undefined): string {
  if (value == null) return '-';
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCnyAsKrw(value: number | null | undefined): string | null {
  if (value == null || value <= 0) return null;
  return Math.round(value * SHOP_COST_EXCHANGE_RATE).toLocaleString();
}

function UnitPriceWithKrw({
  cny,
  title,
}: {
  cny: number | null;
  title?: string;
}) {
  const krw = formatCnyAsKrw(cny);

  return (
    <div className="text-right min-h-[2.25rem] flex flex-col justify-center" title={title}>
      <span className="text-sm font-medium text-gray-900 tabular-nums leading-tight">
        ¥{formatCnyAmount(cny)}
      </span>
      {krw != null ? (
        <span className="text-xs text-indigo-700 tabular-nums leading-tight mt-0.5">
          ₩{krw}
          <span className="text-gray-400 font-normal ml-1">(×{SHOP_COST_EXCHANGE_RATE})</span>
        </span>
      ) : (
        <span className="text-xs text-gray-400 mt-0.5">-</span>
      )}
    </div>
  );
}

function ReadOnlyValue({ value }: { value: string }) {
  return (
    <span className="text-sm text-gray-900 truncate block" title={value}>
      {value}
    </span>
  );
}

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
  initialExpectedUnitPrice,
  orderDate,
  chinaInboundDate,
  chinaOutboundDate,
  koreaArrivalDate,
  actualArrivalDate,
  purchaseOrderProductSize,
  purchaseOrderProductWeight,
  purchaseOrderProductPackagingSize,
  status,
  purchaseOrderId,
  onImageClick,
  onPurchaseOrderClick,
  onWarehouseStockQuantityChange,
  onUnitPriceChange,
  onSellingPriceChange,
  onQuantityPerBoxChange,
  onLogisticsDateChange,
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

          <div className="flex flex-wrap items-end gap-x-6 gap-y-2 mt-2.5 pt-2.5 border-t border-gray-100">
            <div
              className="flex flex-nowrap items-end gap-x-6 px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200/90 shrink-0"
              aria-label="원가 정보"
            >
              <InfoField label="최초 입력 예상단가 (¥)" className="w-[120px]">
                <span
                  className="text-sm text-gray-600 tabular-nums text-right block leading-tight"
                  title="주문 등록 시점의 예상단가 (변경되지 않음)"
                >
                  ¥{formatCnyAmount(initialExpectedUnitPrice)}
                </span>
              </InfoField>

              <div className="w-px self-stretch bg-slate-200 shrink-0" aria-hidden />

              <InfoField label="원가 단가 (¥)" className="min-w-[108px]">
                {purchaseOrderId ? (
                  <UnitPriceWithKrw
                    cny={unitPrice}
                    title="발주 최종 예상단가와 자동 동기화"
                  />
                ) : (
                  <div className="flex flex-col gap-1">
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
                    {formatCnyAsKrw(unitPrice) != null && (
                      <span className="text-xs text-indigo-700 tabular-nums text-right pr-0.5">
                        ₩{formatCnyAsKrw(unitPrice)}
                        <span className="text-gray-400 font-normal ml-1">
                          (×{SHOP_COST_EXCHANGE_RATE})
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </InfoField>
            </div>
          </div>

          <div className="flex flex-nowrap items-end gap-x-2 gap-y-2 min-w-max mt-2 pt-2 border-t border-gray-100">
            <InfoField label="사이즈" className="w-[72px]">
              <ReadOnlyValue value={purchaseOrderProductSize?.trim() || '-'} />
            </InfoField>

            <InfoField label="무게" className="w-[72px]">
              <ReadOnlyValue value={formatWeightDisplay(purchaseOrderProductWeight)} />
            </InfoField>

            <InfoField label="박스" className="min-w-[110px] max-w-[160px]">
              <ReadOnlyValue value={purchaseOrderProductPackagingSize?.trim() || '-'} />
            </InfoField>

            <div className="flex flex-nowrap items-end gap-x-2 ml-8 shrink-0">
              <InfoField label="중국입고" className="w-[118px]">
                <input
                  type="date"
                  value={chinaInboundDate}
                  onChange={(e) => onLogisticsDateChange?.('chinaInboundDate', e.target.value)}
                  className={dateInputClass}
                />
              </InfoField>

              <InfoField label="중국출고" className="w-[118px]">
                <input
                  type="date"
                  value={chinaOutboundDate}
                  onChange={(e) => onLogisticsDateChange?.('chinaOutboundDate', e.target.value)}
                  className={dateInputClass}
                />
              </InfoField>

              <InfoField label="한국도착(예상)" className="w-[118px]">
                <input
                  type="date"
                  value={koreaArrivalDate}
                  onChange={(e) => onLogisticsDateChange?.('koreaArrivalDate', e.target.value)}
                  className={dateInputClass}
                />
              </InfoField>

              <InfoField label="한국도착(실제)" className="w-[118px]">
                <input
                  type="date"
                  value={actualArrivalDate}
                  onChange={(e) => onLogisticsDateChange?.('actualArrivalDate', e.target.value)}
                  className={dateInputClass}
                />
              </InfoField>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
