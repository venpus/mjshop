import { randomUUID } from 'crypto';
import { ShopOrderRepository } from '../repositories/shopOrderRepository.js';
import { ShopBuyerRepository } from '../repositories/shopBuyerRepository.js';
import { StockInboundRepository } from '../repositories/stockInboundRepository.js';
import { calculateShopOrderAmountBreakdown } from '../utils/shopOrderCalculations.js';
import { deriveShopOrderStatus } from '../utils/shopOrderStatus.js';
import {
  buildShopOrderConsolidatedStatementHtml,
  buildShopOrderStatementHtml,
  getConsolidatedShopOrderStatementFileName,
  getShopOrderStatementFileName,
} from '../utils/shopOrderStatementHtml.js';
import { groupStatementLines, type StatementGroupLineInput } from '../utils/shopOrderStatementGroup.js';
import {
  deleteShopOrderLinePaymentProofImage,
  deleteShopOrderLineStatementHtml,
  deleteShopOrderLineFilesDir,
  deleteShopOrderFilesDir,
  getShopOrderFileUrl,
  moveShopOrderLineFilesDir,
  readShopOrderLineStatementHtml,
  saveShopOrderLinePaymentProofImage,
  saveShopOrderLineStatementHtml,
} from '../utils/upload.js';
import {
  ShopOrder,
  CreateShopOrderFromInboundDTO,
  UpdateShopOrderDTO,
  SyncShopOrderDetailDTO,
} from '../models/shopOrder.js';
import type { ShopOrderLine, UpdateShopOrderLineDTO } from '../models/shopOrderLine.js';

export interface BulkStatementGroupResult {
  groupKey: string;
  statementGroupId: string;
  statementIssuedAt: string;
  companyName: string;
  lineCount: number;
  html: string;
  fileName: string;
}

export interface BulkStatementResult {
  groups: BulkStatementGroupResult[];
  statementCount: number;
}

export interface ShopOrderReservationTransferTarget {
  id: string;
  orderNumber: string;
  productName: string;
  productMainImage: string | null;
  warehouseStockQuantity: number;
  stockQuantity: number;
  status: ShopOrder['status'];
}

function calculateOrderQuantity(order: ShopOrder): number {
  return order.lines.reduce(
    (sum, line) => sum + line.orderBoxCount * line.quantityPerBox,
    0
  );
}

function calculateTotalSalesAmount(order: ShopOrder): number {
  if (order.lines.length > 0) {
    return order.lines.reduce((sum, line) => sum + (line.totalAmount ?? 0), 0);
  }
  return order.totalSalesAmount;
}

function calculateTotalProductSupplyAmount(order: ShopOrder): number {
  if (order.lines.length > 0) {
    return order.lines.reduce((sum, line) => sum + (line.productSupplyAmount ?? 0), 0);
  }
  return order.totalProductSupplyAmount;
}

export class ShopOrderService {
  private repository: ShopOrderRepository;
  private stockInboundRepository: StockInboundRepository;
  private buyerRepository: ShopBuyerRepository;
  private lineOrderNumberBackfillPromise: Promise<void> | null = null;

  constructor() {
    this.repository = new ShopOrderRepository();
    this.stockInboundRepository = new StockInboundRepository();
    this.buyerRepository = new ShopBuyerRepository();
  }

  private get lineRepository() {
    return this.repository.getLineRepository();
  }

  private async ensureLineOrderNumbersBackfilled(): Promise<void> {
    if (!this.lineOrderNumberBackfillPromise) {
      this.lineOrderNumberBackfillPromise = this.lineRepository
        .backfillMissingLineOrderNumbers()
        .then((count) => {
          if (count > 0) {
            console.log(`[shopOrder] 주문건 번호 백필 완료: ${count}건`);
          }
        });
    }
    await this.lineOrderNumberBackfillPromise;
  }

  private resolveLineOrderNumber(line: ShopOrderLine, order: ShopOrder): string {
    return line.lineOrderNumber ?? order.orderNumber;
  }

  private async enrichOrderStock(order: ShopOrder): Promise<ShopOrder> {
    let warehouseStock = order.warehouseStockQuantity;

    if (order.stockInboundItemId) {
      const inbound = await this.stockInboundRepository.findById(order.stockInboundItemId);
      if (inbound) {
        warehouseStock = inbound.stockQuantity;
      }
    }

    const orderQuantity =
      order.lines.length > 0 ? calculateOrderQuantity(order) : order.quantity;
    const remainingStock = warehouseStock - orderQuantity;
    const lineCount =
      order.lines.length > 0 ? order.lines.length : order.lineCount;
    const status = deriveShopOrderStatus(lineCount, remainingStock);

    if (order.stockQuantity !== remainingStock) {
      await this.repository.updateStockQuantity(order.id, remainingStock);
    }

    if (order.status !== status) {
      await this.repository.update(order.id, { status });
    }

    return {
      ...order,
      quantity: orderQuantity,
      warehouseStockQuantity: warehouseStock,
      stockQuantity: remainingStock,
      lineCount,
      totalSalesAmount: calculateTotalSalesAmount(order),
      totalProductSupplyAmount: calculateTotalProductSupplyAmount(order),
      status,
    };
  }

  async getAllOrders(): Promise<ShopOrder[]> {
    await this.ensureLineOrderNumbersBackfilled();
    const orders = await this.repository.findAll();
    return Promise.all(orders.map((order) => this.enrichOrderStock(order)));
  }

  async getOrderById(id: string): Promise<ShopOrder | null> {
    await this.ensureLineOrderNumbersBackfilled();
    const order = await this.repository.findById(id);
    if (!order) return null;

    return this.enrichOrderStock(order);
  }

  async createFromInbound(data: CreateShopOrderFromInboundDTO): Promise<{
    order: ShopOrder;
    created: boolean;
  }> {
    const { stockInboundItemId } = data;
    if (!stockInboundItemId) {
      throw new Error('입고 항목 ID가 필요합니다.');
    }

    const existing = await this.repository.findByStockInboundItemId(stockInboundItemId);
    if (existing) {
      const refreshed = await this.getOrderById(existing.id);
      return { order: refreshed!, created: false };
    }

    const inbound = await this.stockInboundRepository.findById(stockInboundItemId);
    if (!inbound) {
      throw new Error('입고 항목을 찾을 수 없습니다.');
    }

    const orderNumber = await this.repository.getNextOrderNumber();
    const today = new Date().toISOString().split('T')[0];

    const order = await this.repository.create({
      id: randomUUID(),
      orderNumber,
      stockInboundItemId: inbound.id,
      purchaseOrderId: inbound.purchaseOrderId,
      productId: inbound.productId,
      productName: inbound.productName,
      productMainImage: inbound.productMainImage,
      unitPrice: inbound.unitPrice,
      quantity: inbound.inboundQuantity,
      stockQuantity: inbound.stockQuantity,
      sellingPrice: inbound.sellingPrice,
      status: '판매대기',
      orderDate: today,
      createdBy: data.createdBy,
    });

    const saleUnitPrice = inbound.sellingPrice ?? null;
    if (saleUnitPrice != null) {
      await this.repository.update(order.id, {
        sellingPrice: saleUnitPrice,
      });
    }

    const refreshed = await this.repository.findById(order.id);
    return { order: await this.enrichOrderStock(refreshed!), created: true };
  }

  async updateOrder(id: string, data: UpdateShopOrderDTO): Promise<ShopOrder> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('주문을 찾을 수 없습니다.');
    }

    const updated = await this.repository.update(id, data);
    if (!updated) {
      throw new Error('주문 수정에 실패했습니다.');
    }
    return updated;
  }

  async deleteOrder(id: string): Promise<void> {
    const order = await this.repository.findById(id);
    if (!order) {
      throw new Error('주문을 찾을 수 없습니다.');
    }

    const lineCount = await this.lineRepository.countByShopOrderId(id);
    if (lineCount > 0) {
      throw new Error(
        '등록된 주문·예약이 있어 삭제할 수 없습니다. 모든 주문 건을 먼저 삭제해 주세요.'
      );
    }

    if (order.lines.length > 0) {
      throw new Error(
        '등록된 주문·예약이 있어 삭제할 수 없습니다. 모든 주문 건을 먼저 삭제해 주세요.'
      );
    }

    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new Error('주문 삭제에 실패했습니다.');
    }

    await deleteShopOrderFilesDir(id);
  }

  async syncOrderDetail(id: string, data: SyncShopOrderDetailDTO): Promise<ShopOrder> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('주문을 찾을 수 없습니다.');
    }

    const quantityPerBox = data.quantityPerBox ?? existing.quantityPerBox;
    if (quantityPerBox < 0) {
      throw new Error('한박스 입수량은 0 이상이어야 합니다.');
    }

    if (data.sellingPrice !== undefined || data.quantityPerBox !== undefined) {
      await this.repository.update(id, {
        sellingPrice: data.sellingPrice ?? existing.sellingPrice,
        quantityPerBox,
      });
    }

    if (data.unitPrice !== undefined) {
      const unitPrice =
        data.unitPrice != null && Number(data.unitPrice) > 0 ? Number(data.unitPrice) : null;
      await this.repository.update(id, { unitPrice });
      if (existing.stockInboundItemId) {
        await this.stockInboundRepository.updateUnitPrice(existing.stockInboundItemId, unitPrice);
      }
    }

    if (data.warehouseStockQuantity !== undefined) {
      const warehouseStockQuantity = Math.max(0, Math.floor(Number(data.warehouseStockQuantity)));
      if (existing.stockInboundItemId) {
        await this.stockInboundRepository.updateStockQuantity(
          existing.stockInboundItemId,
          warehouseStockQuantity
        );
      } else {
        await this.repository.update(id, { warehouseStockQuantity });
      }
    }

    if (data.lines) {
      for (const linePayload of data.lines) {
        const line = existing.lines.find((item) => item.id === linePayload.id);
        if (!line || line.shopOrderId !== id) {
          throw new Error('주문 라인을 찾을 수 없습니다.');
        }

        const orderBoxCount = linePayload.orderBoxCount ?? line.orderBoxCount;
        const lineQuantityPerBox =
          linePayload.quantityPerBox !== undefined
            ? linePayload.quantityPerBox
            : line.quantityPerBox || quantityPerBox;
        const saleUnitPrice =
          linePayload.saleUnitPrice !== undefined
            ? linePayload.saleUnitPrice
            : line.saleUnitPrice;
        const deliveryFee =
          linePayload.deliveryFee !== undefined ? linePayload.deliveryFee : line.deliveryFee;
        const vatExempt =
          linePayload.vatExempt !== undefined ? linePayload.vatExempt : line.vatExempt;

        if (orderBoxCount < 0 || lineQuantityPerBox < 0) {
          throw new Error('박스 수와 한박스 입수량은 0 이상이어야 합니다.');
        }

        const effectiveTrackingNumber =
          linePayload.trackingNumber !== undefined
            ? linePayload.trackingNumber?.replace(/\D/g, '').slice(0, 20) || null
            : line.trackingNumber;

        if (
          linePayload.shippingReady !== undefined &&
          Boolean(effectiveTrackingNumber?.trim())
        ) {
          throw new Error('송장이 등록된 주문 건은 출고준비 상태를 변경할 수 없습니다.');
        }

        const amountBreakdown = calculateShopOrderAmountBreakdown(
          orderBoxCount,
          lineQuantityPerBox,
          saleUnitPrice,
          deliveryFee,
          vatExempt
        );

        await this.lineRepository.update(linePayload.id, {
          companyName:
            linePayload.companyName !== undefined
              ? linePayload.companyName?.trim() || null
              : undefined,
          orderBoxCount,
          quantityPerBox: lineQuantityPerBox,
          saleUnitPrice,
          deliveryFee,
          productSupplyAmount: amountBreakdown?.productSupplyAmount ?? null,
          vatAmount: amountBreakdown?.vatAmount ?? null,
          totalAmount: amountBreakdown?.totalAmount ?? null,
          address:
            linePayload.address !== undefined
              ? linePayload.address?.trim() || null
              : undefined,
          recipientName:
            linePayload.recipientName !== undefined
              ? linePayload.recipientName?.trim() || null
              : undefined,
          phoneNumber:
            linePayload.phoneNumber !== undefined
              ? linePayload.phoneNumber?.trim() || null
              : undefined,
          trackingNumber:
            linePayload.trackingNumber !== undefined
              ? linePayload.trackingNumber?.replace(/\D/g, '').slice(0, 20) || null
              : undefined,
          productArrived: linePayload.productArrived,
          taxInvoiceIssued: linePayload.taxInvoiceIssued,
          vatExempt,
          shippingReady: linePayload.shippingReady,
        });
      }

      await this.repository.syncQuantityFromLines(id);
    }

    const refreshed = await this.repository.findById(id);
    if (!refreshed) {
      throw new Error('주문 조회에 실패했습니다.');
    }
    return this.enrichOrderStock(refreshed);
  }

  async addOrderLine(shopOrderId: string, isReservation = false): Promise<ShopOrder> {
    const order = await this.repository.findById(shopOrderId);
    if (!order) {
      throw new Error('주문을 찾을 수 없습니다.');
    }

    const sortOrder = await this.lineRepository.prepareSortOrderForInsertAtTop(
      shopOrderId,
      isReservation
    );

    const line = await this.lineRepository.create({
      shopOrderId,
      isReservation,
      sortOrder,
      orderBoxCount: 1,
      saleUnitPrice: order.sellingPrice,
      quantityPerBox: order.quantityPerBox,
    });

    const amountBreakdown = calculateShopOrderAmountBreakdown(
      1,
      order.quantityPerBox,
      order.sellingPrice,
      null
    );

    if (amountBreakdown) {
      await this.lineRepository.update(line.id, {
        productSupplyAmount: amountBreakdown.productSupplyAmount,
        vatAmount: amountBreakdown.vatAmount,
        totalAmount: amountBreakdown.totalAmount,
      });
    }

    await this.repository.syncQuantityFromLines(shopOrderId);

    const refreshed = await this.repository.findById(shopOrderId);
    if (!refreshed) {
      throw new Error('주문 조회에 실패했습니다.');
    }
    return this.enrichOrderStock(refreshed);
  }

  private lineBlocksGroupedStatementRemoval(line: ShopOrderLine): boolean {
    return (
      line.statementDelivered ||
      line.paymentReceived ||
      Boolean(line.paymentProofImage)
    );
  }

  private async regenerateStatementGroupHtml(statementGroupId: string): Promise<void> {
    const groupLines = await this.lineRepository.findByStatementGroupId(statementGroupId);
    if (groupLines.length === 0) {
      return;
    }

    const statementIssuedAt =
      groupLines[0].statementIssuedAt ?? new Date().toISOString().slice(0, 10);

    type LoadedLine = { order: ShopOrder; line: ShopOrderLine };
    const loaded: LoadedLine[] = [];
    const orderCache = new Map<string, ShopOrder>();

    for (const groupLine of groupLines) {
      let order = orderCache.get(groupLine.shopOrderId);
      if (!order) {
        const fetched = await this.repository.findById(groupLine.shopOrderId);
        if (!fetched) {
          continue;
        }
        orderCache.set(groupLine.shopOrderId, fetched);
        order = fetched;
      }

      const currentLine = order.lines.find((entry) => entry.id === groupLine.id);
      if (currentLine) {
        loaded.push({ order, line: currentLine });
      }
    }

    if (loaded.length === 0) {
      return;
    }

    const contexts = loaded.map(({ order, line }) =>
      this.buildStatementContext(order, line, statementIssuedAt)
    );
    const html =
      contexts.length === 1
        ? buildShopOrderStatementHtml(contexts[0])
        : buildShopOrderConsolidatedStatementHtml(contexts);

    for (const { order, line } of loaded) {
      const relativePath = await saveShopOrderLineStatementHtml(order.id, line.id, html);
      await this.lineRepository.update(line.id, {
        statementFilePath: relativePath,
        statementGroupId,
        statementIssuedAt,
      });
    }
  }

  async deleteOrderLine(shopOrderId: string, lineId: string): Promise<ShopOrder> {
    const order = await this.repository.findById(shopOrderId);
    if (!order) {
      throw new Error('주문을 찾을 수 없습니다.');
    }

    const line = order.lines.find((item) => item.id === lineId);
    if (!line) {
      throw new Error('주문 라인을 찾을 수 없습니다.');
    }

    const groupId = line.statementGroupId;
    let shouldRegenerateGroup = false;

    if (groupId && (line.statementIssued || line.statementFilePath)) {
      const groupLines = await this.lineRepository.findByStatementGroupId(groupId);
      if (groupLines.length > 1) {
        const blocked = groupLines.some((item) => this.lineBlocksGroupedStatementRemoval(item));
        if (blocked) {
          throw new Error(
            '입금 또는 명세서 전달이 완료된 통합 명세서에 포함된 주문 건은 단독 제거할 수 없습니다.'
          );
        }
        shouldRegenerateGroup = true;
      }
    }

    await deleteShopOrderLineFilesDir(shopOrderId, lineId);
    const deleted = await this.lineRepository.delete(lineId);
    if (!deleted) {
      throw new Error('주문 라인 삭제에 실패했습니다.');
    }

    if (shouldRegenerateGroup && groupId) {
      await this.regenerateStatementGroupHtml(groupId);
    }

    await this.repository.syncQuantityFromLines(shopOrderId);

    const refreshed = await this.repository.findById(shopOrderId);
    if (!refreshed) {
      throw new Error('주문 조회에 실패했습니다.');
    }
    return this.enrichOrderStock(refreshed);
  }

  async convertOrderLineToReservation(shopOrderId: string, lineId: string): Promise<ShopOrder> {
    if (lineId.endsWith('-legacy-line')) {
      throw new Error('레거시 주문 건은 예약으로 전환할 수 없습니다.');
    }

    const order = await this.repository.findById(shopOrderId);
    if (!order) {
      throw new Error('주문을 찾을 수 없습니다.');
    }

    const line = order.lines.find((item) => item.id === lineId);
    if (!line) {
      throw new Error('주문 건을 찾을 수 없습니다.');
    }

    if (line.isReservation) {
      throw new Error('이미 예약으로 등록된 건입니다.');
    }

    const updated = await this.lineRepository.update(lineId, { isReservation: true });
    if (!updated) {
      throw new Error('예약 전환에 실패했습니다.');
    }

    await this.repository.syncQuantityFromLines(shopOrderId);

    const refreshed = await this.repository.findById(shopOrderId);
    if (!refreshed) {
      throw new Error('주문 조회에 실패했습니다.');
    }
    return this.enrichOrderStock(refreshed);
  }

  async convertReservationLineToOrder(shopOrderId: string, lineId: string): Promise<ShopOrder> {
    if (lineId.endsWith('-legacy-line')) {
      throw new Error('레거시 예약 건은 주문으로 전환할 수 없습니다.');
    }

    const order = await this.repository.findById(shopOrderId);
    if (!order) {
      throw new Error('주문을 찾을 수 없습니다.');
    }

    const line = order.lines.find((item) => item.id === lineId);
    if (!line) {
      throw new Error('주문 건을 찾을 수 없습니다.');
    }

    if (!line.isReservation) {
      throw new Error('이미 일반 주문으로 등록된 건입니다.');
    }

    const updated = await this.lineRepository.update(lineId, { isReservation: false });
    if (!updated) {
      throw new Error('주문 전환에 실패했습니다.');
    }

    await this.repository.syncQuantityFromLines(shopOrderId);

    const refreshed = await this.repository.findById(shopOrderId);
    if (!refreshed) {
      throw new Error('주문 조회에 실패했습니다.');
    }
    return this.enrichOrderStock(refreshed);
  }

  async getReservationTransferTargets(
    excludeShopOrderIds: string[] = [],
    productName?: string
  ): Promise<ShopOrderReservationTransferTarget[]> {
    const orders = await this.getAllOrders();
    const exclude = new Set(excludeShopOrderIds.filter(Boolean));
    const normalizedProductName = productName?.trim();

    return orders
      .filter((order) => {
        if (exclude.has(order.id)) return false;
        if (normalizedProductName && order.productName.trim() !== normalizedProductName) {
          return false;
        }
        return (
          order.stockInboundItemId != null && (order.warehouseStockQuantity ?? 0) >= 0
        );
      })
      .map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        productName: order.productName,
        productMainImage: order.productMainImage,
        warehouseStockQuantity: order.warehouseStockQuantity,
        stockQuantity: order.stockQuantity,
        status: order.status,
      }))
      .sort((a, b) => a.orderNumber.localeCompare(b.orderNumber, 'ko'));
  }

  private async transferSingleReservationLine(
    sourceOrderId: string,
    lineId: string,
    targetOrderId: string
  ): Promise<void> {
    if (lineId.endsWith('-legacy-line')) {
      throw new Error('레거시 주문 건은 예약 옮기기를 할 수 없습니다.');
    }

    if (sourceOrderId === targetOrderId) {
      throw new Error('같은 제품 주문으로는 옮길 수 없습니다.');
    }

    const sourceOrder = await this.repository.findById(sourceOrderId);
    if (!sourceOrder) {
      throw new Error('주문을 찾을 수 없습니다.');
    }

    const targetOrderRaw = await this.repository.findById(targetOrderId);
    if (!targetOrderRaw) {
      throw new Error('대상 주문을 찾을 수 없습니다.');
    }

    const targetOrder = await this.enrichOrderStock(targetOrderRaw);
    if (!targetOrder.stockInboundItemId) {
      throw new Error('입고 등록된 주문만 선택할 수 있습니다.');
    }
    if ((targetOrder.warehouseStockQuantity ?? 0) < 0) {
      throw new Error('재고가 0 이상인 주문만 선택할 수 있습니다.');
    }
    if (targetOrder.productName.trim() !== sourceOrder.productName.trim()) {
      throw new Error('동일한 제품명의 주문만 선택할 수 있습니다.');
    }

    const line = sourceOrder.lines.find((item) => item.id === lineId);
    if (!line) {
      throw new Error('주문 건을 찾을 수 없습니다.');
    }
    if (!line.isReservation) {
      throw new Error('예약 건이 아닙니다.');
    }

    const quantityPerBox = line.quantityPerBox || targetOrder.quantityPerBox;
    const saleUnitPrice = line.saleUnitPrice ?? targetOrder.sellingPrice;
    const breakdown = calculateShopOrderAmountBreakdown(
      line.orderBoxCount,
      quantityPerBox,
      saleUnitPrice,
      line.deliveryFee,
      line.vatExempt
    );

    const nextSort = await this.lineRepository.getNextSortOrder(targetOrderId);
    const movedFiles = await moveShopOrderLineFilesDir(sourceOrderId, targetOrderId, lineId);

    const updateData: UpdateShopOrderLineDTO = {
      shopOrderId: targetOrderId,
      isReservation: false,
      sortOrder: nextSort,
      quantityPerBox,
      saleUnitPrice,
      productSupplyAmount: breakdown?.productSupplyAmount ?? null,
      vatAmount: breakdown?.vatAmount ?? null,
      totalAmount: breakdown?.totalAmount ?? null,
    };

    if (movedFiles.statementFilePath != null) {
      updateData.statementFilePath = movedFiles.statementFilePath;
      updateData.statementIssued = true;
    }
    if (movedFiles.paymentProofImage != null) {
      updateData.paymentProofImage = movedFiles.paymentProofImage;
    }

    const updated = await this.lineRepository.update(lineId, updateData);
    if (!updated) {
      throw new Error('예약 옮기기에 실패했습니다.');
    }
  }

  async transferReservationsToOrder(
    items: Array<{ shopOrderId: string; lineId: string }>,
    targetShopOrderId: string
  ): Promise<{ transferredCount: number; targetOrderId: string }> {
    if (items.length === 0) {
      throw new Error('옮길 예약 건을 선택해 주세요.');
    }

    const uniqueItems = Array.from(
      new Map(items.map((item) => [`${item.shopOrderId}:${item.lineId}`, item])).values()
    );

    const sourceOrderIds = new Set<string>();
    for (const item of uniqueItems) {
      await this.transferSingleReservationLine(item.shopOrderId, item.lineId, targetShopOrderId);
      sourceOrderIds.add(item.shopOrderId);
    }

    for (const sourceOrderId of sourceOrderIds) {
      await this.repository.syncQuantityFromLines(sourceOrderId);
    }
    await this.repository.syncQuantityFromLines(targetShopOrderId);

    return { transferredCount: uniqueItems.length, targetOrderId: targetShopOrderId };
  }

  async updateLineCnyExchangeRate(
    shopOrderId: string,
    lineId: string,
    cnyExchangeRate: number | null
  ): Promise<ShopOrderLine> {
    if (lineId.endsWith('-legacy-line')) {
      throw new Error('레거시 주문 건은 환율을 저장할 수 없습니다.');
    }

    const order = await this.repository.findById(shopOrderId);
    if (!order) {
      throw new Error('주문을 찾을 수 없습니다.');
    }

    const line = order.lines.find((item) => item.id === lineId);
    if (!line) {
      throw new Error('주문 건을 찾을 수 없습니다.');
    }

    if (cnyExchangeRate != null && (!Number.isFinite(cnyExchangeRate) || cnyExchangeRate <= 0)) {
      throw new Error('유효한 환율을 입력해 주세요.');
    }

    const updated = await this.lineRepository.update(lineId, { cnyExchangeRate });
    if (!updated) {
      throw new Error('환율 저장에 실패했습니다.');
    }

    return updated;
  }

  async updateLineShipmentBoxCount(
    shopOrderId: string,
    lineId: string,
    shipmentBoxCount: number | null
  ): Promise<ShopOrderLine> {
    if (lineId.endsWith('-legacy-line')) {
      throw new Error('레거시 주문 건은 송장 박스수를 저장할 수 없습니다.');
    }

    const order = await this.repository.findById(shopOrderId);
    if (!order) {
      throw new Error('주문을 찾을 수 없습니다.');
    }

    const line = order.lines.find((item) => item.id === lineId);
    if (!line) {
      throw new Error('주문 건을 찾을 수 없습니다.');
    }

    if (
      shipmentBoxCount != null &&
      (!Number.isInteger(shipmentBoxCount) || shipmentBoxCount < 0)
    ) {
      throw new Error('유효한 송장 박스수를 입력해 주세요.');
    }

    const updated = await this.lineRepository.update(lineId, { shipmentBoxCount });
    if (!updated) {
      throw new Error('송장 박스수 저장에 실패했습니다.');
    }

    return updated;
  }

  async updateLineSettlementPayment(
    shopOrderId: string,
    lineId: string,
    payload: {
      wkSettlementPaid?: boolean;
      inventioSettlementPaid?: boolean;
      logisticsFeePaid?: boolean;
    }
  ): Promise<ShopOrderLine> {
    if (lineId.endsWith('-legacy-line')) {
      throw new Error('레거시 주문 건은 정산 지불 상태를 저장할 수 없습니다.');
    }

    if (
      payload.wkSettlementPaid === undefined &&
      payload.inventioSettlementPaid === undefined &&
      payload.logisticsFeePaid === undefined
    ) {
      throw new Error('저장할 지불 상태가 없습니다.');
    }

    const order = await this.repository.findById(shopOrderId);
    if (!order) {
      throw new Error('주문을 찾을 수 없습니다.');
    }

    const line = order.lines.find((item) => item.id === lineId);
    if (!line) {
      throw new Error('주문 건을 찾을 수 없습니다.');
    }

    const updateData: UpdateShopOrderLineDTO = {};

    if (payload.wkSettlementPaid !== undefined) {
      updateData.wkSettlementPaid = payload.wkSettlementPaid;
      updateData.wkSettlementPaidAt = payload.wkSettlementPaid ? new Date() : null;
    }
    if (payload.inventioSettlementPaid !== undefined) {
      updateData.inventioSettlementPaid = payload.inventioSettlementPaid;
      updateData.inventioSettlementPaidAt = payload.inventioSettlementPaid ? new Date() : null;
    }
    if (payload.logisticsFeePaid !== undefined) {
      updateData.logisticsFeePaid = payload.logisticsFeePaid;
      updateData.logisticsFeePaidAt = payload.logisticsFeePaid ? new Date() : null;
    }

    const updated = await this.lineRepository.update(lineId, updateData);
    if (!updated) {
      throw new Error('정산 지불 상태 저장에 실패했습니다.');
    }

    return updated;
  }

  private buildStatementContext(
    order: ShopOrder,
    line: ShopOrderLine,
    statementDate?: string | null
  ) {
    return {
      orderNumber: this.resolveLineOrderNumber(line, order),
      productName: order.productName,
      orderDate: order.orderDate,
      quantityPerBox: line.quantityPerBox || order.quantityPerBox,
      companyName: line.companyName,
      orderBoxCount: line.orderBoxCount,
      saleUnitPrice: line.saleUnitPrice,
      deliveryFee: line.deliveryFee,
      address: line.address,
      recipientName: line.recipientName,
      phoneNumber: line.phoneNumber,
      isReservation: line.isReservation,
      vatExempt: line.vatExempt,
      statementDate: statementDate ?? null,
    };
  }

  private normalizeStatementDateInput(value?: string | null): string {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
      return value.trim();
    }
    return new Date().toISOString().slice(0, 10);
  }

  private async readSavedOrBuildStatementHtml(
    order: ShopOrder,
    line: ShopOrderLine
  ): Promise<string> {
    if (line.statementFilePath) {
      const savedHtml = await readShopOrderLineStatementHtml(line.statementFilePath);
      if (savedHtml) {
        return savedHtml;
      }
    }

    return buildShopOrderStatementHtml(this.buildStatementContext(order, line));
  }

  async createBulkStatements(
    items: Array<{ shopOrderId: string; lineId: string }>,
    options?: { statementDate?: string | null }
  ): Promise<BulkStatementResult> {
    if (items.length === 0) {
      throw new Error('선택한 주문건이 없습니다.');
    }

    const uniqueItems = Array.from(
      new Map(items.map((item) => [`${item.shopOrderId}:${item.lineId}`, item])).values()
    );

    type GroupLine = StatementGroupLineInput & {
      order: ShopOrder;
      line: ShopOrderLine;
    };

    const orderCache = new Map<string, ShopOrder>();
    const lineInputs: GroupLine[] = [];

    for (const item of uniqueItems) {
      let order = orderCache.get(item.shopOrderId);
      if (!order) {
        const loaded = await this.repository.findById(item.shopOrderId);
        if (!loaded) {
          throw new Error(`주문을 찾을 수 없습니다: ${item.shopOrderId}`);
        }
        orderCache.set(item.shopOrderId, loaded);
        order = loaded;
      }

      const line = order.lines.find((entry) => entry.id === item.lineId);
      if (!line) {
        throw new Error(`주문 건을 찾을 수 없습니다: ${item.lineId}`);
      }

      lineInputs.push({
        shopOrderId: order.id,
        lineId: line.id,
        orderNumber: order.orderNumber,
        companyName: line.companyName,
        address: line.address,
        recipientName: line.recipientName,
        phoneNumber: line.phoneNumber,
        isReservation: line.isReservation,
        vatExempt: line.vatExempt,
        order,
        line,
      });
    }

    if (lineInputs.length === 0) {
      throw new Error('선택한 주문건이 없습니다.');
    }

    const buyers = (await this.buyerRepository.findAllList()).map((buyer) => ({
      id: buyer.id,
      companyName: buyer.companyName,
    }));
    const groups = groupStatementLines(lineInputs, buyers);
    const results: BulkStatementGroupResult[] = [];
    let statementCount = 0;
    const statementIssuedAt = this.normalizeStatementDateInput(options?.statementDate);

    for (const group of groups) {
      const statementGroupId = randomUUID();
      const contexts = group.lines.map(({ order, line }) =>
        this.buildStatementContext(order, line, statementIssuedAt)
      );
      const html =
        contexts.length === 1
          ? buildShopOrderStatementHtml(contexts[0])
          : buildShopOrderConsolidatedStatementHtml(contexts);
      const fileName =
        contexts.length === 1
          ? getShopOrderStatementFileName(
              this.resolveLineOrderNumber(group.lines[0].line, group.lines[0].order)
            )
          : getConsolidatedShopOrderStatementFileName(
              group.companyName,
              group.lines.length,
              statementIssuedAt
            );

      for (const item of group.lines) {
        const relativePath = await saveShopOrderLineStatementHtml(
          item.shopOrderId,
          item.lineId,
          html
        );
        await this.lineRepository.update(item.lineId, {
          statementFilePath: relativePath,
          statementGroupId,
          statementIssuedAt,
        });
        statementCount += 1;
      }

      results.push({
        groupKey: statementGroupId,
        statementGroupId,
        statementIssuedAt,
        companyName: group.companyName,
        lineCount: group.lines.length,
        html,
        fileName,
      });
    }

    return { groups: results, statementCount };
  }

  async cancelBulkStatements(
    items: Array<{ shopOrderId: string; lineId: string }>
  ): Promise<{ cancelledCount: number }> {
    if (items.length === 0) {
      throw new Error('취소할 명세서가 없습니다.');
    }

    const uniqueItems = Array.from(
      new Map(items.map((item) => [`${item.shopOrderId}:${item.lineId}`, item])).values()
    );

    let cancelledCount = 0;
    for (const item of uniqueItems) {
      const cancelled = await this.cancelStatementLine(item.shopOrderId, item.lineId);
      if (cancelled) cancelledCount += 1;
    }

    if (cancelledCount === 0) {
      throw new Error('취소할 명세서가 없습니다.');
    }

    return { cancelledCount };
  }

  private async cancelStatementLine(shopOrderId: string, lineId: string): Promise<boolean> {
    if (lineId.endsWith('-legacy-line')) {
      throw new Error('레거시 주문 건은 명세서를 취소할 수 없습니다.');
    }

    const order = await this.repository.findById(shopOrderId);
    if (!order) {
      throw new Error('주문을 찾을 수 없습니다.');
    }

    const line = order.lines.find((item) => item.id === lineId);
    if (!line) {
      throw new Error('주문 건을 찾을 수 없습니다.');
    }

    if (!line.statementIssued && !line.statementFilePath) {
      return false;
    }

    await deleteShopOrderLineStatementHtml(shopOrderId, lineId);
    await this.lineRepository.update(lineId, {
      statementFilePath: null,
      statementIssued: false,
      statementGroupId: null,
      statementIssuedAt: null,
      statementDelivered: false,
    });

    return true;
  }

  async updateStatementDeliveryStatus(
    items: Array<{ shopOrderId: string; lineId: string }>,
    delivered: boolean
  ): Promise<{ updatedCount: number }> {
    if (items.length === 0) {
      throw new Error('저장할 명세서가 없습니다.');
    }

    const uniqueItems = Array.from(
      new Map(items.map((item) => [`${item.shopOrderId}:${item.lineId}`, item])).values()
    );

    let updatedCount = 0;
    for (const item of uniqueItems) {
      if (item.lineId.endsWith('-legacy-line')) {
        throw new Error('레거시 주문 건은 전달완료 상태를 저장할 수 없습니다.');
      }

      const order = await this.repository.findById(item.shopOrderId);
      if (!order) {
        throw new Error('주문을 찾을 수 없습니다.');
      }

      const line = order.lines.find((row) => row.id === item.lineId);
      if (!line) {
        throw new Error('주문 건을 찾을 수 없습니다.');
      }

      if (!line.statementIssued && !line.statementFilePath) {
        continue;
      }

      await this.lineRepository.update(item.lineId, { statementDelivered: delivered });
      updatedCount += 1;
    }

    if (updatedCount === 0) {
      throw new Error('저장할 명세서가 없습니다.');
    }

    return { updatedCount };
  }

  async updateStatementPaymentStatus(
    items: Array<{ shopOrderId: string; lineId: string }>,
    paymentReceived: boolean
  ): Promise<{ updatedCount: number }> {
    if (items.length === 0) {
      throw new Error('저장할 명세서가 없습니다.');
    }

    const uniqueItems = Array.from(
      new Map(items.map((item) => [`${item.shopOrderId}:${item.lineId}`, item])).values()
    );

    let updatedCount = 0;
    for (const item of uniqueItems) {
      if (item.lineId.endsWith('-legacy-line')) {
        throw new Error('레거시 주문 건은 입금완료 상태를 저장할 수 없습니다.');
      }

      const order = await this.repository.findById(item.shopOrderId);
      if (!order) {
        throw new Error('주문을 찾을 수 없습니다.');
      }

      const line = order.lines.find((row) => row.id === item.lineId);
      if (!line) {
        throw new Error('주문 건을 찾을 수 없습니다.');
      }

      if (!line.statementIssued && !line.statementFilePath) {
        continue;
      }

      await this.lineRepository.update(item.lineId, { paymentReceived });
      updatedCount += 1;
    }

    if (updatedCount === 0) {
      throw new Error('저장할 명세서가 없습니다.');
    }

    return { updatedCount };
  }

  async createOrUpdateStatement(
    shopOrderId: string,
    lineId: string,
    options?: { statementDate?: string | null }
  ): Promise<ShopOrder> {
    const order = await this.repository.findById(shopOrderId);
    if (!order) {
      throw new Error('주문을 찾을 수 없습니다.');
    }

    const line = order.lines.find((item) => item.id === lineId);
    if (!line) {
      throw new Error('주문 라인을 찾을 수 없습니다.');
    }

    const statementIssuedAt = this.normalizeStatementDateInput(options?.statementDate);
    const statementGroupId = randomUUID();
    const html = buildShopOrderStatementHtml(
      this.buildStatementContext(order, line, statementIssuedAt)
    );
    const relativePath = await saveShopOrderLineStatementHtml(shopOrderId, lineId, html);
    await this.lineRepository.update(lineId, {
      statementFilePath: relativePath,
      statementGroupId,
      statementIssuedAt,
    });

    const refreshed = await this.repository.findById(shopOrderId);
    if (!refreshed) {
      throw new Error('주문 조회에 실패했습니다.');
    }
    return this.enrichOrderStock(refreshed);
  }

  async previewStatementGroup(
    items: Array<{ shopOrderId: string; lineId: string }>
  ): Promise<{ html: string; fileName: string }> {
    if (items.length === 0) {
      throw new Error('미리볼 명세서 주문건이 없습니다.');
    }

    const uniqueItems = Array.from(
      new Map(items.map((item) => [`${item.shopOrderId}:${item.lineId}`, item])).values()
    );

    type LoadedLine = { order: ShopOrder; line: ShopOrderLine };
    const loaded: LoadedLine[] = [];
    const orderCache = new Map<string, ShopOrder>();

    for (const item of uniqueItems) {
      let order = orderCache.get(item.shopOrderId);
      if (!order) {
        const fetched = await this.repository.findById(item.shopOrderId);
        if (!fetched) {
          throw new Error(`주문을 찾을 수 없습니다: ${item.shopOrderId}`);
        }
        orderCache.set(item.shopOrderId, fetched);
        order = fetched;
      }

      const line = order.lines.find((entry) => entry.id === item.lineId);
      if (!line) {
        throw new Error(`주문 건을 찾을 수 없습니다: ${item.lineId}`);
      }
      if (!line.statementIssued && !line.statementFilePath) {
        throw new Error('생성된 명세서가 없습니다.');
      }

      loaded.push({ order, line });
    }

    const first = loaded[0];
    if (first.line.statementFilePath) {
      const savedHtml = await readShopOrderLineStatementHtml(first.line.statementFilePath);
      if (savedHtml) {
        const companyName = (first.line.companyName ?? '').trim() || '미상';
        const fileName =
          loaded.length === 1
            ? getShopOrderStatementFileName(this.resolveLineOrderNumber(first.line, first.order))
            : getConsolidatedShopOrderStatementFileName(
                companyName,
                loaded.length,
                first.line.statementIssuedAt
              );
        return { html: savedHtml, fileName };
      }
    }

    const contexts = loaded.map(({ order, line }) =>
      this.buildStatementContext(order, line, line.statementIssuedAt)
    );
    const html =
      contexts.length === 1
        ? buildShopOrderStatementHtml(contexts[0])
        : buildShopOrderConsolidatedStatementHtml(contexts);

    const companyName = (first.line.companyName ?? '').trim() || '미상';
    const fileName =
      contexts.length === 1
        ? getShopOrderStatementFileName(this.resolveLineOrderNumber(first.line, first.order))
        : getConsolidatedShopOrderStatementFileName(
            companyName,
            contexts.length,
            first.line.statementIssuedAt
          );

    return { html, fileName };
  }

  async getStatementPreview(
    shopOrderId: string,
    lineId: string
  ): Promise<{ html: string; fileName: string }> {
    const order = await this.repository.findById(shopOrderId);
    if (!order) {
      throw new Error('주문을 찾을 수 없습니다.');
    }

    const line = order.lines.find((item) => item.id === lineId);
    if (!line?.statementFilePath) {
      throw new Error('생성된 명세서가 없습니다.');
    }

    const html = await this.readSavedOrBuildStatementHtml(order, line);
    return {
      html,
      fileName: getShopOrderStatementFileName(this.resolveLineOrderNumber(line, order)),
    };
  }

  async getStatementDownloadInfo(
    shopOrderId: string,
    lineId: string
  ): Promise<{ html: string; fileName: string } | null> {
    const order = await this.repository.findById(shopOrderId);
    if (!order) return null;

    const line = order.lines.find((item) => item.id === lineId);
    if (!line?.statementFilePath) return null;

    const html = await this.readSavedOrBuildStatementHtml(order, line);
    return {
      html,
      fileName: getShopOrderStatementFileName(this.resolveLineOrderNumber(line, order)),
    };
  }

  async uploadPaymentProof(
    shopOrderId: string,
    lineId: string,
    tempFilePath: string
  ): Promise<ShopOrder> {
    const order = await this.repository.findById(shopOrderId);
    if (!order) {
      throw new Error('주문을 찾을 수 없습니다.');
    }

    const line = order.lines.find((item) => item.id === lineId);
    if (!line) {
      throw new Error('주문 라인을 찾을 수 없습니다.');
    }

    if (line.paymentProofImage) {
      await deleteShopOrderLinePaymentProofImage(shopOrderId, lineId);
    }

    const relativePath = await saveShopOrderLinePaymentProofImage(
      tempFilePath,
      shopOrderId,
      lineId
    );
    const imageUrl = getShopOrderFileUrl(relativePath);
    await this.lineRepository.update(lineId, {
      paymentProofImage: imageUrl,
    });

    const refreshed = await this.repository.findById(shopOrderId);
    if (!refreshed) {
      throw new Error('주문 조회에 실패했습니다.');
    }
    return this.enrichOrderStock(refreshed);
  }

  async deletePaymentProof(shopOrderId: string, lineId: string): Promise<ShopOrder> {
    const order = await this.repository.findById(shopOrderId);
    if (!order) {
      throw new Error('주문을 찾을 수 없습니다.');
    }

    const line = order.lines.find((item) => item.id === lineId);
    if (!line) {
      throw new Error('주문 라인을 찾을 수 없습니다.');
    }

    await deleteShopOrderLinePaymentProofImage(shopOrderId, lineId);
    await this.lineRepository.update(lineId, {
      paymentProofImage: null,
    });

    const refreshed = await this.repository.findById(shopOrderId);
    if (!refreshed) {
      throw new Error('주문 조회에 실패했습니다.');
    }
    return this.enrichOrderStock(refreshed);
  }
}
