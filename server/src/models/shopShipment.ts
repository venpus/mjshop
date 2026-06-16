export type ShopShipmentDeliveryStatus = 'before_start' | 'in_transit' | 'delivered';

export const SHOP_LOGISTICS_COMPANY_LOGEN = '로젠';
export const SHOP_LOGISTICS_T_CODE_LOGEN = '06';

export interface ShopShipmentBatch {
  id: string;
  shipmentDate: string;
  logisticsFeePaid: boolean;
  logisticsFeePaidAt: Date | null;
  createdAt: Date;
}

export interface ShopShipment {
  id: string;
  batchId: string;
  trackingNumber: string;
  logisticsCompany: string;
  tCode: string;
  deliveryStatus: ShopShipmentDeliveryStatus;
  shipmentBoxCount: number | null;
  deliveryFee: number | null;
  boxPrice: number | null;
  lastTrackingKind: string | null;
  lastTrackingAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShopShipmentLine {
  id: string;
  shipmentId: string;
  shopOrderId: string;
  lineId: string;
  createdAt: Date;
}

export interface ShopShipmentListRow {
  shipmentLineId: string;
  shipmentId: string;
  shipmentDate: string;
  trackingNumber: string;
  logisticsCompany: string;
  deliveryStatus: ShopShipmentDeliveryStatus;
  shipmentBoxCount: number | null;
  deliveryFee: number | null;
  boxPrice: number | null;
  lastTrackingKind: string | null;
  lastTrackingAt: string | null;
  shopOrderId: string;
  lineId: string;
  orderNumber: string;
  productName: string;
  orderDate: string | null;
  lineOrderNumber: string | null;
  lineIndex: number;
  isReservation: boolean;
  companyName: string | null;
  recipientName: string | null;
  phoneNumber: string | null;
  address: string | null;
  orderBoxCount: number;
  quantityPerBox: number;
}

export interface ShopShipmentBatchShipmentItem {
  shipmentId: string;
  trackingNumber: string;
  logisticsCompany: string;
  deliveryStatus: ShopShipmentDeliveryStatus;
  lastTrackingKind: string | null;
  lastTrackingAt: string | null;
}

export interface ShopShipmentBatchLineItem {
  lineId: string;
  shopOrderId: string;
  orderNumber: string;
  productName: string;
  lineOrderNumber: string | null;
  lineIndex: number;
  companyName: string | null;
  orderBoxCount: number;
  quantityPerBox: number;
}

export interface ShopShipmentBatchListItem {
  batchId: string;
  shipmentDate: string;
  recipientName: string | null;
  phoneNumber: string | null;
  address: string | null;
  shipmentBoxCount: number | null;
  deliveryFee: number | null;
  boxPrice: number | null;
  logisticsFeePaid: boolean;
  logisticsFeePaidAt: string | null;
  shipments: ShopShipmentBatchShipmentItem[];
  lineItems: ShopShipmentBatchLineItem[];
}

export interface UpdateShopShipmentBatchDTO {
  shipmentBoxCount?: number | null;
  deliveryFee?: number | null;
  boxPrice?: number | null;
  logisticsFeePaid?: boolean;
}

export interface CreateShopShipmentBatchDTO {
  shipmentDate: string;
  shipments: Array<{
    trackingNumber: string;
    lineItems: Array<{ shopOrderId: string; lineId: string }>;
    shipmentBoxCount?: number | null;
    deliveryFee?: number | null;
    boxPrice?: number | null;
  }>;
}

export interface UpdateShopShipmentDTO {
  shipmentBoxCount?: number | null;
  deliveryFee?: number | null;
  boxPrice?: number | null;
}
