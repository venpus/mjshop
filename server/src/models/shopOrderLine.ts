export interface ShopOrderLine {
  id: string;
  lineOrderNumber: string | null;
  shopOrderId: string;
  sortOrder: number;
  isReservation: boolean;
  companyName: string | null;
  orderBoxCount: number;
  quantityPerBox: number;
  saleUnitPrice: number | null;
  deliveryFee: number | null;
  productSupplyAmount: number | null;
  vatAmount: number | null;
  totalAmount: number | null;
  address: string | null;
  recipientName: string | null;
  phoneNumber: string | null;
  trackingNumber: string | null;
  statementIssued: boolean;
  paymentReceived: boolean;
  productArrived: boolean;
  taxInvoiceIssued: boolean;
  vatExempt: boolean;
  shippingReady: boolean;
  cnyExchangeRate: number | null;
  wkSettlementPaid: boolean;
  inventioSettlementPaid: boolean;
  shipmentBoxCount: number | null;
  logisticsFeePaid: boolean;
  logisticsFeePaidAt: Date | null;
  wkSettlementPaidAt: Date | null;
  inventioSettlementPaidAt: Date | null;
  statementFilePath: string | null;
  statementGroupId: string | null;
  statementIssuedAt: string | null;
  statementDelivered: boolean;
  paymentProofImage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateShopOrderLineDTO {
  shopOrderId: string;
  sortOrder?: number;
  isReservation?: boolean;
  orderBoxCount?: number;
  saleUnitPrice?: number | null;
  quantityPerBox?: number;
}

export interface UpdateShopOrderLineDTO {
  companyName?: string | null;
  orderBoxCount?: number;
  quantityPerBox?: number;
  saleUnitPrice?: number | null;
  deliveryFee?: number | null;
  productSupplyAmount?: number | null;
  vatAmount?: number | null;
  totalAmount?: number | null;
  address?: string | null;
  recipientName?: string | null;
  phoneNumber?: string | null;
  trackingNumber?: string | null;
  productArrived?: boolean;
  taxInvoiceIssued?: boolean;
  vatExempt?: boolean;
  shippingReady?: boolean;
  cnyExchangeRate?: number | null;
  wkSettlementPaid?: boolean;
  inventioSettlementPaid?: boolean;
  shipmentBoxCount?: number | null;
  logisticsFeePaid?: boolean;
  logisticsFeePaidAt?: Date | null;
  wkSettlementPaidAt?: Date | null;
  inventioSettlementPaidAt?: Date | null;
  statementIssued?: boolean;
  paymentReceived?: boolean;
  statementFilePath?: string | null;
  statementGroupId?: string | null;
  statementIssuedAt?: string | null;
  statementDelivered?: boolean;
  paymentProofImage?: string | null;
  sortOrder?: number;
  isReservation?: boolean;
  shopOrderId?: string;
}
