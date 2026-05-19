import { PaymentRequest } from '../api/paymentRequestApi';

export interface PaymentRequestLedgerDateGroup {
  date: string;
  items: PaymentRequest[];
  totals: {
    advance: number;
    balance: number;
    shipping: number;
  };
}

export interface PurchaseOrderLedgerRow {
  productName: string;
  poNumber: string;
  quantityLabel: string;
  paymentTypeLabel: string;
  amountLabel: string;
  productImage?: string;
}

export function formatPurchaseOrderQuantity(quantity?: number): string {
  if (quantity == null || Number.isNaN(quantity)) {
    return '-';
  }
  return `${quantity.toLocaleString()}개`;
}

export function buildPurchaseOrderLedgerRow(item: PaymentRequest): PurchaseOrderLedgerRow {
  return {
    productName: item.source_info?.product_name || '-',
    poNumber: item.source_info?.po_number || item.source_id,
    quantityLabel: formatPurchaseOrderQuantity(item.source_info?.quantity),
    paymentTypeLabel: item.payment_type === 'advance' ? '선금' : '잔금',
    amountLabel: `¥${item.amount.toLocaleString()}`,
    productImage: item.source_info?.product_image,
  };
}
