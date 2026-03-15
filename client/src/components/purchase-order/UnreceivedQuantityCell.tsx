import { AlertTriangle } from 'lucide-react';
import { getDaysPast } from '../../utils/dateUtils';
import { useLanguage } from '../../contexts/LanguageContext';

export interface UnreceivedQuantityCellProps {
  /** 미입고 수량 (발주 수량 - 업체 출고 수량) */
  unreceivedQuantity: number | undefined;
  /** 예정 납기일 (YYYY-MM-DD) */
  estimatedDelivery: string | undefined;
  /** 납기일 경과 + 미입고 수량 0 초과 여부. true이면 강조 스타일 적용 */
  isOverdueWithUnreceived: boolean;
  /** 납기일 미지정 여부. true이면 주황 강조 + '납기일 미지정' 메시지 표시 */
  hasNoDeliveryDate?: boolean;
}

/**
 * 발주 목록의 미입고 수량 셀.
 * 납기일 경과+미입고 시 빨간 강조, 납기일 미지정 시 주황 강조 + '납기일 미지정' 표시.
 */
export function UnreceivedQuantityCell({
  unreceivedQuantity,
  estimatedDelivery,
  isOverdueWithUnreceived,
  hasNoDeliveryDate = false,
}: UnreceivedQuantityCellProps) {
  const { t } = useLanguage();
  const unit = t('purchaseOrder.list.quantityUnit');
  const qtyText = unreceivedQuantity !== undefined ? `${unreceivedQuantity}${unit}` : '-';
  const daysPast = isOverdueWithUnreceived && estimatedDelivery ? getDaysPast(estimatedDelivery) : 0;

  return (
    <div className="flex flex-col gap-0.5 items-center">
      <div className="flex items-center gap-1 flex-wrap justify-center">
        {isOverdueWithUnreceived && (
          <AlertTriangle
            className="w-4 h-4 text-red-600 flex-shrink-0"
            aria-hidden
          />
        )}
        {hasNoDeliveryDate && (
          <AlertTriangle
            className="w-4 h-4 text-amber-600 flex-shrink-0"
            aria-hidden
          />
        )}
        <span
          className={
            isOverdueWithUnreceived
              ? 'text-red-700 font-bold'
              : hasNoDeliveryDate
                ? 'text-amber-700 font-bold'
                : 'text-gray-600'
          }
        >
          {qtyText}
        </span>
      </div>
      {hasNoDeliveryDate ? (
        <span className="text-xs text-red-700 font-bold">
          {t('purchaseOrder.badge.noDeliveryDate')}
        </span>
      ) : (
        <>
          {estimatedDelivery && (
            <span className={`text-xs ${isOverdueWithUnreceived ? 'text-red-700 font-bold' : 'text-gray-500'}`}>
              {t('purchaseOrder.list.dueDateLabel')}: {estimatedDelivery}
            </span>
          )}
          {isOverdueWithUnreceived && daysPast > 0 && (
            <span className="text-xs text-red-700 font-bold">
              {t('purchaseOrder.list.daysOverdue').replace('{{days}}', String(daysPast))}
            </span>
          )}
        </>
      )}
    </div>
  );
}
