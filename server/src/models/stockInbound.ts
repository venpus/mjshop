export interface StockInboundItem {
  id: number;
  purchaseOrderId: string;
  groupKey: string;
  productId: string | null;
  productName: string;
  poNumber: string | null;
  productMainImage: string | null;
  unitPrice: number | null;
  inboundQuantity: number;
  sellingPrice: number | null;
  stockQuantity: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
}

export interface AvailablePurchaseOrderForInbound {
  id: string;
  poNumber: string;
  productName: string;
  productMainImage: string | null;
  productId: string | null;
  quantity: number;
  arrivedQuantity: number;
  unitPrice: number | null;
  orderUnitPrice: number | null;
  expectedFinalUnitPrice: number | null;
  sellingPrice: number | null;
}

export interface CreateStockInboundBatchDTO {
  purchaseOrderIds: string[];
  createdBy?: string;
}

export interface BatchCreateStockInboundResult {
  created: StockInboundItem[];
  skipped: Array<{ purchaseOrderId: string; reason: string }>;
}
