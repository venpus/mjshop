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
import { groupStatementLines } from '../utils/shopOrderStatementGroup.js';
import {
  deleteShopOrderLinePaymentProofImage,
  deleteShopOrderLineFilesDir,
  getShopOrderFileUrl,
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
  companyName: string;
  lineCount: number;
  html: string;
  fileName: string;
}

export interface BulkStatementResult {
  groups: BulkStatementGroupResult[];
  statementCount: number;
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

  constructor() {
    this.repository = new ShopOrderRepository();
    this.stockInboundRepository = new StockInboundRepository();
    this.buyerRepository = new ShopBuyerRepository();
  }

  private get lineRepository() {
    return this.repository.getLineRepository();
  }

  private async enrichOrderStock(order: ShopOrder): Promise<ShopOrder> {
    let warehouseStock = order.stockQuantity;

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
    const orders = await this.repository.findAll();
    return Promise.all(orders.map((order) => this.enrichOrderStock(order)));
  }

  async getOrderById(id: string): Promise<ShopOrder | null> {
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

        if (orderBoxCount < 0 || lineQuantityPerBox < 0) {
          throw new Error('박스 수와 한박스 입수량은 0 이상이어야 합니다.');
        }

        const amountBreakdown = calculateShopOrderAmountBreakdown(
          orderBoxCount,
          lineQuantityPerBox,
          saleUnitPrice,
          deliveryFee
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

  async addOrderLine(shopOrderId: string): Promise<ShopOrder> {
    const order = await this.repository.findById(shopOrderId);
    if (!order) {
      throw new Error('주문을 찾을 수 없습니다.');
    }

    await this.lineRepository.create({
      shopOrderId,
      saleUnitPrice: order.sellingPrice,
      quantityPerBox: order.quantityPerBox,
    });

    const refreshed = await this.repository.findById(shopOrderId);
    if (!refreshed) {
      throw new Error('주문 조회에 실패했습니다.');
    }
    return this.enrichOrderStock(refreshed);
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

    await deleteShopOrderLineFilesDir(shopOrderId, lineId);
    const deleted = await this.lineRepository.delete(lineId);
    if (!deleted) {
      throw new Error('주문 라인 삭제에 실패했습니다.');
    }

    await this.repository.syncQuantityFromLines(shopOrderId);

    const refreshed = await this.repository.findById(shopOrderId);
    if (!refreshed) {
      throw new Error('주문 조회에 실패했습니다.');
    }
    return this.enrichOrderStock(refreshed);
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

  private buildStatementContext(order: ShopOrder, line: ShopOrderLine) {
    return {
      orderNumber: order.orderNumber,
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
    };
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

  async createBulkStatements(orderIds: string[]): Promise<BulkStatementResult> {
    if (orderIds.length === 0) {
      throw new Error('선택한 주문이 없습니다.');
    }

    const uniqueOrderIds = [...new Set(orderIds)];
    const orders: ShopOrder[] = [];

    for (const orderId of uniqueOrderIds) {
      const order = await this.repository.findById(orderId);
      if (!order) {
        throw new Error(`주문을 찾을 수 없습니다: ${orderId}`);
      }
      orders.push(order);
    }

    type GroupLine = {
      shopOrderId: string;
      lineId: string;
      orderNumber: string;
      companyName: string | null;
      address: string | null;
      recipientName: string | null;
      phoneNumber: string | null;
      order: ShopOrder;
      line: ShopOrderLine;
    };

    const lineInputs: GroupLine[] = [];
    for (const order of orders) {
      for (const line of order.lines) {
        lineInputs.push({
          shopOrderId: order.id,
          lineId: line.id,
          orderNumber: order.orderNumber,
          companyName: line.companyName,
          address: line.address,
          recipientName: line.recipientName,
          phoneNumber: line.phoneNumber,
          order,
          line,
        });
      }
    }

    if (lineInputs.length === 0) {
      throw new Error('선택한 주문에 판매 주문이 없습니다.');
    }

    const buyers = (await this.buyerRepository.findAllList()).map((buyer) => ({
      id: buyer.id,
      companyName: buyer.companyName,
    }));
    const groups = groupStatementLines(lineInputs, buyers);
    const results: BulkStatementGroupResult[] = [];
    let statementCount = 0;

    for (const group of groups) {
      const contexts = group.lines.map(({ order, line }) =>
        this.buildStatementContext(order, line)
      );
      const html =
        contexts.length === 1
          ? buildShopOrderStatementHtml(contexts[0])
          : buildShopOrderConsolidatedStatementHtml(contexts);
      const fileName =
        contexts.length === 1
          ? getShopOrderStatementFileName(
              group.lines[0].orderNumber,
              group.lines[0].line.sortOrder
            )
          : getConsolidatedShopOrderStatementFileName(
              group.companyName,
              group.lines.length
            );

      for (const item of group.lines) {
        const relativePath = await saveShopOrderLineStatementHtml(
          item.shopOrderId,
          item.lineId,
          html
        );
        await this.lineRepository.update(item.lineId, {
          statementFilePath: relativePath,
        });
        statementCount += 1;
      }

      results.push({
        groupKey: group.groupKey,
        companyName: group.companyName,
        lineCount: group.lines.length,
        html,
        fileName,
      });
    }

    return { groups: results, statementCount };
  }

  async createOrUpdateStatement(shopOrderId: string, lineId: string): Promise<ShopOrder> {
    const order = await this.repository.findById(shopOrderId);
    if (!order) {
      throw new Error('주문을 찾을 수 없습니다.');
    }

    const line = order.lines.find((item) => item.id === lineId);
    if (!line) {
      throw new Error('주문 라인을 찾을 수 없습니다.');
    }

    const html = buildShopOrderStatementHtml(this.buildStatementContext(order, line));
    const relativePath = await saveShopOrderLineStatementHtml(shopOrderId, lineId, html);
    await this.lineRepository.update(lineId, {
      statementFilePath: relativePath,
    });

    const refreshed = await this.repository.findById(shopOrderId);
    if (!refreshed) {
      throw new Error('주문 조회에 실패했습니다.');
    }
    return this.enrichOrderStock(refreshed);
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
      fileName: getShopOrderStatementFileName(order.orderNumber, line.sortOrder),
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
      fileName: getShopOrderStatementFileName(order.orderNumber, line.sortOrder),
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
