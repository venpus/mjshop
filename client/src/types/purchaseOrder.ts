export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: string;
  product: string;
  productImage?: string;
  unitPrice: number;
  optionCost: number;
  quantity: number;
  size: string;
  weight: string;
  packaging: number;
  factoryStatus: "출고대기" | "배송중" | "수령완료";
  workStatus: "작업대기" | "작업중" | "완료";
  deliveryStatus:
    | "공장출고"
    | "중국운송중"
    | "항공운송중"
    | "해운운송중"
    | "통관및 배달"
    | "한국도착";
  paymentStatus: "미결제" | "선금결제" | "완료";
  date: string;
  supplierContact?: string;
  supplierAddress?: string;
  notes?: string;
  estimatedDelivery?: string;
}
