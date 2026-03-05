import { AlertTriangle } from 'lucide-react';
import { getDaysPast } from '../../utils/dateUtils';

export interface UnreceivedQuantityCellProps {
  /** 미입고 수량 (발주 수량 - 업체 출고 수량) */
  unreceivedQuantity: number | undefined;
  /** 예정 납기일 (YYYY-MM-DD) */
  estimatedDelivery: string | undefined;
  /** 납기일 경과 + 미입고 수량 0 초과 여부. true이면 강조 스타일 적용 */
  isOverdueWithUnreceived: boolean;
}

/**
 * 발주 목록의 미입고 수량 셀.
 * 납기일이 지났고 미입고 수량이 있는 경우 강조(빨간색, 아이콘, 납기경과·N일 경과) 표시.
 */
export function UnreceivedQuantityCell({
  unreceivedQuantity,
  estimatedDelivery,
  isOverdueWithUnreceived,
}: UnreceivedQuantityCellProps) {
  const qtyText = unreceivedQuantity !== undefined ? `${unreceivedQuantity}개` : '-';
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
        <span
          className={
            isOverdueWithUnreceived
              ? 'text-red-700 font-bold'
              : 'text-gray-600'
          }
        >
          {qtyText}
        </span>
      </div>
      {estimatedDelivery && (
        <span className={`text-xs ${isOverdueWithUnreceived ? 'text-red-700 font-bold' : 'text-gray-500'}`}>
          납기: {estimatedDelivery}
        </span>
      )}
      {isOverdueWithUnreceived && daysPast > 0 && (
        <span className="text-xs text-red-700 font-bold">
          {daysPast}일 경과
        </span>
      )}
    </div>
  );
}
