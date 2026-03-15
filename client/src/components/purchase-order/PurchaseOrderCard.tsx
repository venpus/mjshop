import { Image as ImageIcon } from 'lucide-react';
import { StatusBadge } from '../ui/status-badge';
import { useLanguage } from '../../contexts/LanguageContext';

/** 카드에 표시하기 위한 발주 최소 타입 (상세 타입은 목록 페이지에만 유지) */
export interface PurchaseOrderCardItem {
  id: string;
  poNumber: string;
  date: string;
  product?: {
    name: string;
    name_chinese?: string | null;
    main_image: string | null;
  };
  quantity: number;
  orderStatus: '발주확인' | '발주 대기' | '취소됨';
  paymentStatus: '미결제' | '선금결제' | '완료';
  advancePaymentAmount?: number | null;
  advancePaymentDate?: string | null;
  balancePaymentAmount?: number | null;
  balancePaymentDate?: string | null;
  unreceivedQuantity?: number;
  estimatedDelivery?: string;
}

export interface PurchaseOrderCardRowData {
  po: PurchaseOrderCardItem;
  finalPaymentAmount: number;
  isOverdueWithUnreceived: boolean;
  hasNoDeliveryDate: boolean;
}

export interface PurchaseOrderCardProps {
  rowData: PurchaseOrderCardRowData;
  productDisplayName: string;
  getFullImageUrl: (url: string | null | undefined) => string;
  onNavigateToDetail: () => void;
  isSelected?: boolean;
  onToggleSelect?: (e: React.MouseEvent) => void;
}

/**
 * 발주 목록 모바일용 카드 1개.
 * 주요 정보만 표시: 이미지, 상품명, 발주번호·날짜, 발주/결제 상태, 수량·발주금액, 미입고 경고.
 */
export function PurchaseOrderCard({
  rowData,
  productDisplayName,
  getFullImageUrl,
  onNavigateToDetail,
  isSelected = false,
  onToggleSelect,
}: PurchaseOrderCardProps) {
  const { t } = useLanguage();
  const { po, finalPaymentAmount, isOverdueWithUnreceived, hasNoDeliveryDate } = rowData;
  const imageUrl = po.product?.main_image ? getFullImageUrl(po.product.main_image) : '';

  const orderStatusKey = po.orderStatus === '발주확인' ? 'confirmed' : po.orderStatus === '취소됨' ? 'cancelled' : 'pending';
  const orderStatusLabel = t(`purchaseOrder.orderStatus.${orderStatusKey}`);

  const hasAdvance = po.advancePaymentAmount != null && po.advancePaymentAmount > 0;
  const hasBalance = po.balancePaymentAmount != null && po.balancePaymentAmount > 0;
  const paymentKey = !hasAdvance && !hasBalance
    ? (po.paymentStatus === '미결제' ? 'unpaid' : po.paymentStatus === '선금결제' ? 'advance' : 'complete')
    : hasAdvance && hasBalance && po.advancePaymentDate && po.balancePaymentDate
      ? 'complete'
      : hasAdvance && po.advancePaymentDate
        ? 'advance'
        : 'unpaid';
  const paymentLabel = t(`purchaseOrder.paymentStatus.${paymentKey}`);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onNavigateToDetail}
      onKeyDown={(e) => e.key === 'Enter' && onNavigateToDetail()}
      className={`relative rounded-lg border bg-white shadow-sm transition-shadow active:shadow-md ${
        isOverdueWithUnreceived
          ? 'border-red-300 bg-red-50/50'
          : hasNoDeliveryDate
            ? 'border-amber-300 bg-amber-50/50'
            : 'border-gray-200'
      }`}
    >
      {/* 납기 경고 뱃지: 카드 오른쪽 상단 */}
      {(isOverdueWithUnreceived || hasNoDeliveryDate) && (
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10 pointer-events-none">
          {isOverdueWithUnreceived && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800">
              {t('purchaseOrder.badge.overdue')}
            </span>
          )}
          {hasNoDeliveryDate && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800">
              {t('purchaseOrder.badge.noDeliveryDate')}
            </span>
          )}
        </div>
      )}

      <div className="flex gap-3 p-3">
        {onToggleSelect != null && (
          <div className="flex-shrink-0 pt-1" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(e);
              }}
              className="h-4 w-4 cursor-pointer accent-purple-600"
              aria-label={t('purchaseOrder.list.select')}
            />
          </div>
        )}
        <div className="w-24 h-24 flex-shrink-0 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={productDisplayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <ImageIcon className="w-8 h-8 text-gray-400" />
          )}
        </div>
        <div className="min-w-0 flex-1 flex flex-col gap-1.5 pr-16">
          <p className="font-medium text-gray-900 truncate">{productDisplayName}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{po.poNumber}</span>
            <span>{po.date}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge
              status={orderStatusLabel}
              type="order"
              orderStatusKey={orderStatusKey}
              size="xs"
            />
            <StatusBadge
              status={paymentLabel}
              type="payment"
              paymentStatusKey={paymentKey}
              size="xs"
            />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-gray-600">
              {po.quantity}개 · ¥{finalPaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            {(isOverdueWithUnreceived || hasNoDeliveryDate) && po.unreceivedQuantity != null && (
              <span className={`text-xs font-medium ${isOverdueWithUnreceived ? 'text-red-600' : 'text-amber-600'}`}>
                {t('purchaseOrder.card.unreceivedCount').replace('{{count}}', String(po.unreceivedQuantity))}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
