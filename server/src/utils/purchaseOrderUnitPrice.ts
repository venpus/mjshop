export interface PurchaseOrderUnitPriceSource {
  expectedFinalUnitPrice?: number | null;
  orderUnitPrice?: number | null;
  unitPrice?: number | null;
}

/** 발주 기준 원가 단가 우선순위: 최종 예상단가 → 발주단가 → 기본 단가 */
export function resolvePurchaseOrderUnitPrice(
  po: PurchaseOrderUnitPriceSource
): number | null {
  if (po.expectedFinalUnitPrice != null && po.expectedFinalUnitPrice > 0) {
    return po.expectedFinalUnitPrice;
  }
  if (po.orderUnitPrice != null && po.orderUnitPrice > 0) {
    return po.orderUnitPrice;
  }
  if (po.unitPrice != null && po.unitPrice > 0) {
    return po.unitPrice;
  }
  return null;
}
