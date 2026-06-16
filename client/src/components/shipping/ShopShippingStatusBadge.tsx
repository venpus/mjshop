import type { ShopShipmentDeliveryStatus } from '../../api/shopShipmentApi';
import { getShopShipmentDeliveryStatusLabel } from '../../api/shopShipmentApi';

const STATUS_CLASS: Record<ShopShipmentDeliveryStatus, string> = {
  before_start: 'bg-gray-100 text-gray-600 border-gray-200',
  in_transit: 'bg-sky-50 text-sky-700 border-sky-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

interface ShopShippingStatusBadgeProps {
  status: ShopShipmentDeliveryStatus;
  compact?: boolean;
}

export function ShopShippingStatusBadge({ status, compact = false }: ShopShippingStatusBadgeProps) {
  return (
    <span
      title={getShopShipmentDeliveryStatusLabel(status)}
      className={`inline-flex items-center justify-center rounded border whitespace-nowrap font-semibold ${compact ? 'min-w-[3.25rem] px-1 h-4 text-[9px]' : 'min-w-[4.5rem] px-1.5 h-6 text-[10px]'} ${STATUS_CLASS[status]}`}
    >
      {getShopShipmentDeliveryStatusLabel(status)}
    </span>
  );
}
