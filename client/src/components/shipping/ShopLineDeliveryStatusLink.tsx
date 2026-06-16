import { useNavigate } from 'react-router-dom';
import type { ShopShipmentDeliveryStatus } from '../../api/shopShipmentApi';
import {
  deriveLineDeliveryDisplay,
  getLineShipmentInfo,
  shopShippingPathForLine,
  type LineShipmentInfo,
} from '../../utils/shopLineShipmentUtils';

const STATUS_CLASS: Record<ShopShipmentDeliveryStatus, string> = {
  before_start: 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200',
  in_transit: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
};

interface ShopLineDeliveryStatusLinkProps {
  lineId: string;
  lineShipmentMap: Map<string, LineShipmentInfo>;
  compact?: boolean;
  className?: string;
}

export function ShopLineDeliveryStatusLink({
  lineId,
  lineShipmentMap,
  compact = false,
  className = '',
}: ShopLineDeliveryStatusLinkProps) {
  const navigate = useNavigate();
  const info = getLineShipmentInfo(lineShipmentMap, lineId);
  const display = deriveLineDeliveryDisplay(info);

  if (!display.clickable) {
    return (
      <span className={`text-xs text-gray-400 whitespace-nowrap ${className}`}>
        {display.message}
      </span>
    );
  }

  const statusClass = display.status ? STATUS_CLASS[display.status] : STATUS_CLASS.before_start;

  return (
    <button
      type="button"
      title="배송 관리에서 상세 보기"
      onClick={(e) => {
        e.stopPropagation();
        navigate(shopShippingPathForLine(lineId));
      }}
      className={`inline-flex items-center justify-center rounded border font-semibold whitespace-nowrap transition-colors ${
        compact
          ? 'min-h-[22px] max-w-[7rem] px-1.5 py-0.5 text-[10px] truncate'
          : 'min-h-[26px] max-w-[8rem] px-2 py-0.5 text-[11px] truncate'
      } ${statusClass} ${className}`}
    >
      {display.message}
    </button>
  );
}
