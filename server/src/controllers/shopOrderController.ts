import { Request, Response } from 'express';
import { ShopOrderService } from '../services/shopOrderService.js';
import {
  CreateShopOrderFromInboundDTO,
  UpdateShopOrderDTO,
  SyncShopOrderDetailDTO,
} from '../models/shopOrder.js';

function setAttachmentFilename(res: Response, fileName: string): void {
  const fallback = fileName.replace(/[^\x20-\x7E]/g, '_') || 'statement.html';
  const encoded = encodeURIComponent(fileName);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${fallback.replace(/"/g, "'")}"; filename*=UTF-8''${encoded}`
  );
}

export class ShopOrderController {
  private service: ShopOrderService;

  constructor() {
    this.service = new ShopOrderService();
  }

  getAllOrders = async (_req: Request, res: Response): Promise<void> => {
    try {
      const orders = await this.service.getAllOrders();
      res.json({ success: true, data: orders });
    } catch (error: unknown) {
      console.error('주문 목록 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '주문 목록 조회 중 오류가 발생했습니다.',
      });
    }
  };

  getOrderById = async (req: Request, res: Response): Promise<void> => {
    try {
      const order = await this.service.getOrderById(req.params.id);
      if (!order) {
        res.status(404).json({ success: false, error: '주문을 찾을 수 없습니다.' });
        return;
      }
      res.json({ success: true, data: order });
    } catch (error: unknown) {
      console.error('주문 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '주문 조회 중 오류가 발생했습니다.',
      });
    }
  };

  createFromInbound = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: CreateShopOrderFromInboundDTO = {
        stockInboundItemId: Number(req.body.stockInboundItemId),
        createdBy: (req as Request & { user?: { id?: string } }).user?.id,
      };

      const result = await this.service.createFromInbound(data);

      res.status(result.created ? 201 : 200).json({
        success: true,
        data: result.order,
        created: result.created,
        message: result.created
          ? '주문 관리에 등록되었습니다.'
          : '이미 등록된 주문입니다.',
      });
    } catch (error: unknown) {
      console.error('주문 등록 오류:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '주문 등록 중 오류가 발생했습니다.',
      });
    }
  };

  updateOrder = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: UpdateShopOrderDTO = {
        productName: req.body.productName,
        quantity: req.body.quantity != null ? Number(req.body.quantity) : undefined,
        sellingPrice:
          req.body.sellingPrice != null ? Number(req.body.sellingPrice) : req.body.sellingPrice,
        status: req.body.status,
        orderDate: req.body.orderDate,
        note: req.body.note,
        quantityPerBox:
          req.body.quantityPerBox != null ? Number(req.body.quantityPerBox) : undefined,
        updatedBy: (req as Request & { user?: { id?: string } }).user?.id,
      };

      const order = await this.service.updateOrder(req.params.id, data);
      res.json({ success: true, data: order });
    } catch (error: unknown) {
      console.error('주문 수정 오류:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '주문 수정 중 오류가 발생했습니다.',
      });
    }
  };

  syncOrderDetail = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: SyncShopOrderDetailDTO = {
        sellingPrice:
          req.body.sellingPrice != null ? Number(req.body.sellingPrice) : req.body.sellingPrice,
        quantityPerBox:
          req.body.quantityPerBox != null ? Number(req.body.quantityPerBox) : undefined,
        lines: Array.isArray(req.body.lines)
          ? req.body.lines.map((line: Record<string, unknown>) => ({
              id: String(line.id),
              companyName: line.companyName,
              orderBoxCount:
                line.orderBoxCount != null ? Number(line.orderBoxCount) : undefined,
              quantityPerBox:
                line.quantityPerBox != null ? Number(line.quantityPerBox) : undefined,
              saleUnitPrice:
                line.saleUnitPrice != null ? Number(line.saleUnitPrice) : line.saleUnitPrice,
              deliveryFee:
                line.deliveryFee != null ? Number(line.deliveryFee) : line.deliveryFee,
              address: line.address,
              recipientName: line.recipientName,
              phoneNumber: line.phoneNumber,
              trackingNumber: line.trackingNumber,
              productArrived:
                line.productArrived !== undefined ? Boolean(line.productArrived) : undefined,
              taxInvoiceIssued:
                line.taxInvoiceIssued !== undefined ? Boolean(line.taxInvoiceIssued) : undefined,
            }))
          : undefined,
      };

      const order = await this.service.syncOrderDetail(req.params.id, data);
      res.json({ success: true, data: order });
    } catch (error: unknown) {
      console.error('주문 상세 저장 오류:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '주문 저장 중 오류가 발생했습니다.',
      });
    }
  };

  addOrderLine = async (req: Request, res: Response): Promise<void> => {
    try {
      const order = await this.service.addOrderLine(req.params.id);
      res.status(201).json({ success: true, data: order, message: '주문이 추가되었습니다.' });
    } catch (error: unknown) {
      console.error('주문 라인 추가 오류:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '주문 추가 중 오류가 발생했습니다.',
      });
    }
  };

  deleteOrderLine = async (req: Request, res: Response): Promise<void> => {
    try {
      const order = await this.service.deleteOrderLine(req.params.id, req.params.lineId);
      res.json({ success: true, data: order, message: '주문이 삭제되었습니다.' });
    } catch (error: unknown) {
      console.error('주문 라인 삭제 오류:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '주문 삭제 중 오류가 발생했습니다.',
      });
    }
  };

  updateLineCnyExchangeRate = async (req: Request, res: Response): Promise<void> => {
    try {
      const raw = req.body.cnyExchangeRate;
      const cnyExchangeRate =
        raw === null || raw === '' || raw === undefined ? null : Number(raw);

      const line = await this.service.updateLineCnyExchangeRate(
        req.params.id,
        req.params.lineId,
        cnyExchangeRate
      );
      res.json({ success: true, data: line, message: '환율이 저장되었습니다.' });
    } catch (error: unknown) {
      console.error('환율 저장 오류:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '환율 저장 중 오류가 발생했습니다.',
      });
    }
  };

  updateLineSettlementPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const line = await this.service.updateLineSettlementPayment(req.params.id, req.params.lineId, {
        wkSettlementPaid:
          req.body.wkSettlementPaid !== undefined
            ? Boolean(req.body.wkSettlementPaid)
            : undefined,
        inventioSettlementPaid:
          req.body.inventioSettlementPaid !== undefined
            ? Boolean(req.body.inventioSettlementPaid)
            : undefined,
        logisticsFeePaid:
          req.body.logisticsFeePaid !== undefined
            ? Boolean(req.body.logisticsFeePaid)
            : undefined,
      });
      res.json({ success: true, data: line, message: '정산 지불 상태가 저장되었습니다.' });
    } catch (error: unknown) {
      console.error('정산 지불 상태 저장 오류:', error);
      res.status(400).json({
        success: false,
        error:
          error instanceof Error ? error.message : '정산 지불 상태 저장 중 오류가 발생했습니다.',
      });
    }
  };

  updateLineShipmentBoxCount = async (req: Request, res: Response): Promise<void> => {
    try {
      const raw = req.body.shipmentBoxCount;
      const shipmentBoxCount =
        raw === null || raw === '' || raw === undefined ? null : Number(raw);

      const line = await this.service.updateLineShipmentBoxCount(
        req.params.id,
        req.params.lineId,
        shipmentBoxCount
      );
      res.json({ success: true, data: line, message: '송장 박스수가 저장되었습니다.' });
    } catch (error: unknown) {
      console.error('송장 박스수 저장 오류:', error);
      res.status(400).json({
        success: false,
        error:
          error instanceof Error ? error.message : '송장 박스수 저장 중 오류가 발생했습니다.',
      });
    }
  };

  createStatement = async (req: Request, res: Response): Promise<void> => {
    try {
      const order = await this.service.createOrUpdateStatement(
        req.params.id,
        req.params.lineId
      );
      res.json({ success: true, data: order, message: '명세서가 생성되었습니다.' });
    } catch (error: unknown) {
      console.error('명세서 생성 오류:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '명세서 생성 중 오류가 발생했습니다.',
      });
    }
  };

  createBulkStatements = async (req: Request, res: Response): Promise<void> => {
    try {
      const orderIds = Array.isArray(req.body?.orderIds)
        ? req.body.orderIds.map((value: unknown) => String(value))
        : [];

      if (orderIds.length === 0) {
        res.status(400).json({ success: false, error: 'orderIds가 필요합니다.' });
        return;
      }

      const result = await this.service.createBulkStatements(orderIds);
      res.json({
        success: true,
        data: result,
        message: `명세서 ${result.statementCount}건(통합 ${result.groups.length}장)을 생성했습니다.`,
      });
    } catch (error: unknown) {
      console.error('일괄 명세서 생성 오류:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '명세서 생성 중 오류가 발생했습니다.',
      });
    }
  };

  getStatementPreview = async (req: Request, res: Response): Promise<void> => {
    try {
      const preview = await this.service.getStatementPreview(
        req.params.id,
        req.params.lineId
      );
      res.json({ success: true, data: preview });
    } catch (error: unknown) {
      console.error('명세서 미리보기 오류:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '명세서 미리보기 중 오류가 발생했습니다.',
      });
    }
  };

  downloadStatement = async (req: Request, res: Response): Promise<void> => {
    try {
      const info = await this.service.getStatementDownloadInfo(
        req.params.id,
        req.params.lineId
      );
      if (!info) {
        res.status(404).json({ success: false, error: '다운로드할 명세서가 없습니다.' });
        return;
      }
      setAttachmentFilename(res, info.fileName);
      res.type('html').send(info.html);
    } catch (error: unknown) {
      console.error('명세서 다운로드 오류:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '명세서 다운로드 중 오류가 발생했습니다.',
      });
    }
  };

  uploadPaymentProof = async (req: Request, res: Response): Promise<void> => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ success: false, error: '업로드할 이미지 파일이 없습니다.' });
        return;
      }
      const order = await this.service.uploadPaymentProof(
        req.params.id,
        req.params.lineId,
        file.path
      );
      res.json({ success: true, data: order, message: '입금 내역 이미지가 업로드되었습니다.' });
    } catch (error: unknown) {
      console.error('입금 내역 업로드 오류:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '입금 내역 업로드 중 오류가 발생했습니다.',
      });
    }
  };

  deletePaymentProof = async (req: Request, res: Response): Promise<void> => {
    try {
      const order = await this.service.deletePaymentProof(req.params.id, req.params.lineId);
      res.json({ success: true, data: order, message: '입금 내역 이미지가 삭제되었습니다.' });
    } catch (error: unknown) {
      console.error('입금 내역 삭제 오류:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '입금 내역 삭제 중 오류가 발생했습니다.',
      });
    }
  };
}
