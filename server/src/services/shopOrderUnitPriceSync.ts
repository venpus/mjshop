import { StockInboundRepository } from '../repositories/stockInboundRepository.js';
import { ShopOrderRepository } from '../repositories/shopOrderRepository.js';
import { resolvePurchaseOrderUnitPrice } from '../utils/purchaseOrderUnitPrice.js';

/**
 * 발주 최종 예상단가(및 fallback) 변경 시 입고·주문관리 원가 단가 동기화
 */
export async function syncShopOrderUnitPriceFromPurchaseOrder(
  purchaseOrderId: string
): Promise<void> {
  const stockInboundRepository = new StockInboundRepository();
  const shopOrderRepository = new ShopOrderRepository();

  const po = await stockInboundRepository.findPurchaseOrderForSync(purchaseOrderId);
  if (!po) return;

  const unitPrice = resolvePurchaseOrderUnitPrice({
    expectedFinalUnitPrice: po.expectedFinalUnitPrice,
    orderUnitPrice: po.orderUnitPrice,
    unitPrice: po.unitPrice,
  });
  if (unitPrice == null) return;

  const inbound = await stockInboundRepository.findByPurchaseOrderId(purchaseOrderId);
  if (inbound) {
    await stockInboundRepository.updateUnitPrice(inbound.id, unitPrice);
  }

  await shopOrderRepository.updateUnitPriceByPurchaseOrderId(purchaseOrderId, unitPrice);
}
