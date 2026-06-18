export interface ShopOrderAmountBreakdown {
  productSupplyAmount: number;
  vatAmount: number;
  totalAmount: number;
}

export function calculateShopOrderAmountBreakdown(
  orderBoxCount: number,
  quantityPerBox: number,
  saleUnitPrice: number | null,
  deliveryFee: number | null,
  vatExempt = false
): ShopOrderAmountBreakdown | null {
  if (saleUnitPrice == null && deliveryFee == null) return null;

  const productSupplyAmount = orderBoxCount * quantityPerBox * (saleUnitPrice ?? 0);
  const vatAmount = vatExempt ? 0 : Math.round(productSupplyAmount * 0.1);
  const totalAmount =
    (vatExempt ? productSupplyAmount : Math.round(productSupplyAmount * 1.1)) +
    (deliveryFee ?? 0);

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
  deliveryFee: number | null,
  vatExempt = false
): number | null {
  return (
    calculateShopOrderAmountBreakdown(
      orderBoxCount,
      quantityPerBox,
      saleUnitPrice,
      deliveryFee,
      vatExempt
    )?.totalAmount ?? null
  );
}
