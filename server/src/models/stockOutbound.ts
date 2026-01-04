export interface StockOutboundRecord {
  id: number;
  groupKey: string;
  outboundDate: string;
  customerName: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export interface CreateStockOutboundRecordDTO {
  groupKey: string;
  outboundDate: string;
  customerName: string;
  quantity: number;
  createdBy?: string;
}

export interface UpdateStockOutboundRecordDTO {
  outboundDate?: string;
  customerName?: string;
  quantity?: number;
  updatedBy?: string;
}

