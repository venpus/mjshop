import { StockInboundRepository } from '../repositories/stockInboundRepository.js';
import {
  StockInboundItem,
  AvailablePurchaseOrderForInbound,
  CreateStockInboundBatchDTO,
  BatchCreateStockInboundResult,
} from '../models/stockInbound.js';
import { resolvePurchaseOrderUnitPrice } from '../utils/purchaseOrderUnitPrice.js';

function resolveUnitPrice(po: AvailablePurchaseOrderForInbound): number | null {
  return resolvePurchaseOrderUnitPrice({
    expectedFinalUnitPrice: po.expectedFinalUnitPrice,
    orderUnitPrice: po.orderUnitPrice,
    unitPrice: po.unitPrice,
  });
}

function resolveInboundQuantity(po: AvailablePurchaseOrderForInbound): number {
  if (po.arrivedQuantity > 0) return po.arrivedQuantity;
  return po.quantity;
}

function buildGroupKey(purchaseOrderId: string, productName: string): string {
  return `${purchaseOrderId}-${productName}`;
}

export class StockInboundService {
  private repository: StockInboundRepository;

  constructor() {
    this.repository = new StockInboundRepository();
  }

  async getAllItems(): Promise<StockInboundItem[]> {
    return this.repository.findAll();
  }

  async getAvailablePurchaseOrders(
    searchTerm?: string,
    page?: number,
    limit?: number
  ): Promise<{
    items: AvailablePurchaseOrderForInbound[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const pageNum = page && page > 0 ? page : 1;
    const limitNum = limit && limit > 0 ? limit : 15;
    const offset = (pageNum - 1) * limitNum;

    const { items, total } = await this.repository.findAvailablePurchaseOrders(
      searchTerm,
      limitNum,
      offset
    );

    return {
      items,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
    };
  }

  async getItemByGroupKey(groupKey: string): Promise<StockInboundItem | null> {
    return this.repository.findByGroupKey(groupKey);
  }

  async addFromPurchaseOrders(data: CreateStockInboundBatchDTO): Promise<BatchCreateStockInboundResult> {
    if (!data.purchaseOrderIds?.length) {
      throw new Error('추가할 발주를 선택해 주세요.');
    }

    const uniqueIds = [...new Set(data.purchaseOrderIds)];
    const created: StockInboundItem[] = [];
    const skipped: Array<{ purchaseOrderId: string; reason: string }> = [];

    for (const purchaseOrderId of uniqueIds) {
      const existing = await this.repository.findByPurchaseOrderId(purchaseOrderId);
      if (existing) {
        skipped.push({ purchaseOrderId, reason: '이미 입고 목록에 등록된 발주입니다.' });
        continue;
      }

      const po = await this.repository.findPurchaseOrderForInboundById(purchaseOrderId);

      if (!po) {
        skipped.push({ purchaseOrderId, reason: '발주를 찾을 수 없거나 이미 입고되었습니다.' });
        continue;
      }

      const inboundQuantity = resolveInboundQuantity(po);
      if (inboundQuantity <= 0) {
        skipped.push({ purchaseOrderId, reason: '입고할 수량이 없습니다.' });
        continue;
      }

      const item = await this.repository.create({
        purchaseOrderId: po.id,
        groupKey: buildGroupKey(po.id, po.productName),
        productId: po.productId,
        productName: po.productName,
        poNumber: po.poNumber,
        productMainImage: po.productMainImage,
        unitPrice: resolveUnitPrice(po),
        inboundQuantity,
        sellingPrice: po.sellingPrice,
        stockQuantity: inboundQuantity,
        createdBy: data.createdBy,
      });

      created.push(item);
    }

    if (created.length === 0 && skipped.length > 0) {
      throw new Error(skipped.map((s) => s.reason).join(' '));
    }

    return { created, skipped };
  }

  /**
   * 패킹리스트 한국도착 수량 변경 시 입고 재고 자동 동기화
   */
  async syncFromPurchaseOrder(purchaseOrderId: string): Promise<StockInboundItem | null> {
    const po = await this.repository.findPurchaseOrderForSync(purchaseOrderId);
    if (!po) {
      await this.repository.deleteByPurchaseOrderId(purchaseOrderId);
      return null;
    }

    const arrivedQuantity = po.arrivedQuantity;
    const existing = await this.repository.findByPurchaseOrderId(purchaseOrderId);

    if (arrivedQuantity <= 0) {
      if (existing) {
        await this.repository.deleteByPurchaseOrderId(purchaseOrderId);
      }
      return null;
    }

    const unitPrice = resolveUnitPrice(po);

    if (existing) {
      const delta = arrivedQuantity - existing.inboundQuantity;
      const nextStock = Math.max(0, existing.stockQuantity + delta);
      const updated = await this.repository.updateQuantities(existing.id, {
        inboundQuantity: arrivedQuantity,
        stockQuantity: nextStock,
        unitPrice,
        sellingPrice: po.sellingPrice,
        productMainImage: po.productMainImage,
        productName: po.productName,
        poNumber: po.poNumber,
        productId: po.productId,
      });
      await this.syncShopOrdersUnitPrice(purchaseOrderId, unitPrice);
      return updated;
    }

    const created = await this.repository.create({
      purchaseOrderId: po.id,
      groupKey: buildGroupKey(po.id, po.productName),
      productId: po.productId,
      productName: po.productName,
      poNumber: po.poNumber,
      productMainImage: po.productMainImage,
      unitPrice,
      inboundQuantity: arrivedQuantity,
      sellingPrice: po.sellingPrice,
      stockQuantity: arrivedQuantity,
    });
    await this.syncShopOrdersUnitPrice(purchaseOrderId, unitPrice);
    return created;
  }

  private async syncShopOrdersUnitPrice(
    purchaseOrderId: string,
    unitPrice: number | null
  ): Promise<void> {
    if (unitPrice == null) return;
    const { ShopOrderRepository } = await import('../repositories/shopOrderRepository.js');
    const shopOrderRepository = new ShopOrderRepository();
    await shopOrderRepository.updateUnitPriceByPurchaseOrderId(purchaseOrderId, unitPrice);
  }

  async syncFromPackingListItem(packingListItemId: number): Promise<void> {
    const { PackingListRepository } = await import('../repositories/packingListRepository.js');
    const packingListRepository = new PackingListRepository();
    const item = await packingListRepository.findItemById(packingListItemId);
    if (!item?.purchase_order_id) return;
    await this.syncFromPurchaseOrder(String(item.purchase_order_id));
  }
}
