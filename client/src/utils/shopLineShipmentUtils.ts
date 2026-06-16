import type {
  ShopShipmentBatchListItem,
  ShopShipmentBatchShipmentItem,
  ShopShipmentDeliveryStatus,
} from '../api/shopShipmentApi';
import { getShopShipmentDeliveryStatusLabel } from '../api/shopShipmentApi';

export interface LineShipmentInfo {
  batchId: string;
  shipments: ShopShipmentBatchShipmentItem[];
}

export interface LineDeliveryDisplay {
  status: ShopShipmentDeliveryStatus | null;
  message: string;
  clickable: boolean;
}

export function buildLineShipmentMap(
  batches: ShopShipmentBatchListItem[]
): Map<string, LineShipmentInfo> {
  const map = new Map<string, LineShipmentInfo>();
  for (const batch of batches) {
    const info: LineShipmentInfo = {
      batchId: batch.batchId,
      shipments: batch.shipments,
    };
    for (const line of batch.lineItems) {
      map.set(line.lineId, info);
    }
  }
  return map;
}

export function getLineShipmentInfo(
  lineShipmentMap: Map<string, LineShipmentInfo>,
  lineId: string
): LineShipmentInfo | undefined {
  return lineShipmentMap.get(lineId);
}

export function deriveLineDeliveryDisplay(
  info: LineShipmentInfo | undefined
): LineDeliveryDisplay {
  if (!info || info.shipments.length === 0) {
    return { status: null, message: '미등록', clickable: false };
  }

  const shipments = info.shipments;
  if (shipments.every((shipment) => shipment.deliveryStatus === 'delivered')) {
    return { status: 'delivered', message: '배송완료', clickable: true };
  }

  const inTransit = shipments.find((shipment) => shipment.deliveryStatus === 'in_transit');
  if (inTransit) {
    const kind = inTransit.lastTrackingKind?.trim();
    return {
      status: 'in_transit',
      message: kind || getShopShipmentDeliveryStatusLabel('in_transit'),
      clickable: true,
    };
  }

  const beforeStart = shipments.find((shipment) => shipment.deliveryStatus === 'before_start');
  const kind = beforeStart?.lastTrackingKind?.trim();
  return {
    status: 'before_start',
    message: kind || getShopShipmentDeliveryStatusLabel('before_start'),
    clickable: true,
  };
}

export function shopShippingManagementPath(): string {
  return '/admin/shipping';
}

export function shopShippingPathForLine(lineId: string): string {
  return `/admin/shipping?lineId=${encodeURIComponent(lineId)}`;
}
