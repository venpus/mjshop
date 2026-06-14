import type { ShopOrderLine } from './shopOrderLine.js';

export type ShopOrderStatus = '판매대기' | '판매중' | '품절' | '판매완료';

export interface ShopOrder {
  id: string;
  orderNumber: string;
  stockInboundItemId: number | null;
  purchaseOrderId: string | null;
  productId: string | null;
  productName: string;
  productMainImage: string | null;
  unitPrice: number | null;
  quantity: number;
  stockQuantity: number;
  warehouseStockQuantity: number;
  sellingPrice: number | null;
  status: ShopOrderStatus;
  orderDate: string | null;
  note: string | null;
  quantityPerBox: number;
  /** @deprecated 주문 라인(kr_shop_order_lines)으로 이전됨. 목록 호환용 */
  companyName: string | null;
  orderBoxCount: number;
  saleUnitPrice: number | null;
  deliveryFee: number | null;
  totalAmount: number | null;
  address: string | null;
  recipientName: string | null;
  phoneNumber: string | null;
  trackingNumber: string | null;
  statementIssued: boolean;
  paymentReceived: boolean;
  productArrived: boolean;
  statementFilePath: string | null;
  paymentProofImage: string | null;
  lines: ShopOrderLine[];
  lineCount: number;
  /** 모든 판매 주문 라인 totalAmount 합계 (VAT·택배비 포함) */
  totalSalesAmount: number;
  /** 모든 판매 주문 라인 productSupplyAmount 합계 (VAT·택배비 제외) */
  totalProductSupplyAmount: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
}

export interface CreateShopOrderFromInboundDTO {
  stockInboundItemId: number;
  createdBy?: string;
}

export interface UpdateShopOrderDTO {
  productName?: string;
  quantity?: number;
  sellingPrice?: number | null;
  status?: ShopOrderStatus;
  orderDate?: string | null;
  note?: string | null;
  quantityPerBox?: number;
  updatedBy?: string;
}

export interface UpdateShopOrderLinePayload {
  id: string;
  companyName?: string | null;
  orderBoxCount?: number;
  quantityPerBox?: number;
  saleUnitPrice?: number | null;
  deliveryFee?: number | null;
  address?: string | null;
  recipientName?: string | null;
  phoneNumber?: string | null;
  trackingNumber?: string | null;
  productArrived?: boolean;
  taxInvoiceIssued?: boolean;
}

export interface SyncShopOrderDetailDTO {
  sellingPrice?: number | null;
  quantityPerBox?: number;
  lines?: UpdateShopOrderLinePayload[];
}
