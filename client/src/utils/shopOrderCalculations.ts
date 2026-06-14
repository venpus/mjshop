export function calculateTotalOrderQuantity(
  lines: Array<{ orderBoxCount: number; quantityPerBox: number }>
): number {
  return lines.reduce((sum, line) => sum + line.orderBoxCount * line.quantityPerBox, 0);
}

export function calculateRemainingStock(
  warehouseStockQuantity: number,
  orderQuantity: number
): number {
  return warehouseStockQuantity - orderQuantity;
}

export interface ShopOrderAmountBreakdown {
  productSupplyAmount: number;
  vatAmount: number;
  totalAmount: number;
}

export function calculateShopOrderAmountBreakdown(
  orderBoxCount: number,
  quantityPerBox: number,
  saleUnitPrice: number | null,
  deliveryFee: number | null
): ShopOrderAmountBreakdown | null {
  if (saleUnitPrice == null && deliveryFee == null) return null;

  const productSupplyAmount = orderBoxCount * quantityPerBox * (saleUnitPrice ?? 0);
  const vatAmount = Math.round(productSupplyAmount * 0.1);
  const totalAmount = Math.round(productSupplyAmount * 1.1) + (deliveryFee ?? 0);

  return {
    productSupplyAmount,
    vatAmount,
    totalAmount,
  };
}

export function calculateShopOrderTotalAmount(
  orderBoxCount: number,
  quantityPerBox: number,
  saleUnitPrice: number | null,
  deliveryFee: number | null
): number | null {
  return (
    calculateShopOrderAmountBreakdown(
      orderBoxCount,
      quantityPerBox,
      saleUnitPrice,
      deliveryFee
    )?.totalAmount ?? null
  );
}

export interface ShopOrderLineForm {
  id: string;
  lineOrderNumber?: string | null;
  isReservation: boolean;
  companyName: string;
  orderBoxCount: number;
  quantityPerBox: number;
  saleUnitPrice: number | null;
  deliveryFee: number | null;
  address: string;
  recipientName: string;
  phoneNumber: string;
  trackingNumber: string;
  productArrived: boolean;
  taxInvoiceIssued: boolean;
  statementFilePath: string | null;
  paymentProofImage: string | null;
}

/** @deprecated ShopOrderLineForm 사용 */
export interface ShopOrderProgressForm extends ShopOrderLineForm {}

export function getLineAmountBreakdown(line: ShopOrderLineForm): ShopOrderAmountBreakdown | null {
  return calculateShopOrderAmountBreakdown(
    line.orderBoxCount,
    line.quantityPerBox,
    line.saleUnitPrice,
    line.deliveryFee
  );
}

export function getLineTotalAmount(line: ShopOrderLineForm): number | null {
  return getLineAmountBreakdown(line)?.totalAmount ?? null;
}

export function createEmptyLineForm(
  id: string,
  saleUnitPrice: number | null = null,
  quantityPerBox = 0
): ShopOrderLineForm {
  return {
    id,
    isReservation: false,
    companyName: '',
    orderBoxCount: 0,
    quantityPerBox,
    saleUnitPrice,
    deliveryFee: null,
    address: '',
    recipientName: '',
    phoneNumber: '',
    trackingNumber: '',
    productArrived: false,
    taxInvoiceIssued: false,
    statementFilePath: null,
    paymentProofImage: null,
  };
}
