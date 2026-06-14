export interface ShopOrderLine {
  id: string;
  shopOrderId: string;
  sortOrder: number;
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
  cnyExchangeRate: number | null;
  wkSettlementPaid: boolean;
  inventioSettlementPaid: boolean;
  shipmentBoxCount: number | null;
  logisticsFeePaid: boolean;
  logisticsFeePaidAt: Date | null;
  wkSettlementPaidAt: Date | null;
  inventioSettlementPaidAt: Date | null;
  statementFilePath: string | null;
  paymentProofImage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateShopOrderLineDTO {
  shopOrderId: string;
  sortOrder?: number;
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
  paymentProofImage?: string | null;
  sortOrder?: number;
}
