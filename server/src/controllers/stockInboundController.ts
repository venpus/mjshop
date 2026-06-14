import { Request, Response } from 'express';
import { StockInboundService } from '../services/stockInboundService.js';
import { CreateStockInboundBatchDTO } from '../models/stockInbound.js';

export class StockInboundController {
  private service: StockInboundService;

  constructor() {
    this.service = new StockInboundService();
  }

  getAllItems = async (_req: Request, res: Response): Promise<void> => {
    try {
      const items = await this.service.getAllItems();
      res.json({ success: true, data: items });
    } catch (error: unknown) {
      console.error('입고 목록 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '입고 목록 조회 중 오류가 발생했습니다.',
      });
    }
  };

  getAvailablePurchaseOrders = async (req: Request, res: Response): Promise<void> => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 15;

      const result = await this.service.getAvailablePurchaseOrders(search, page, limit);

      res.json({
        success: true,
        data: result.items,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error: unknown) {
      console.error('입고 가능 발주 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '발주 목록 조회 중 오류가 발생했습니다.',
      });
    }
  };

  getItemByGroupKey = async (req: Request, res: Response): Promise<void> => {
    try {
      const groupKey = decodeURIComponent(req.params.groupKey);
      const item = await this.service.getItemByGroupKey(groupKey);
      if (!item) {
        res.status(404).json({ success: false, error: '입고 항목을 찾을 수 없습니다.' });
        return;
      }
      res.json({ success: true, data: item });
    } catch (error: unknown) {
      console.error('입고 항목 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '입고 항목 조회 중 오류가 발생했습니다.',
      });
    }
  };

  addBatch = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: CreateStockInboundBatchDTO = {
        purchaseOrderIds: req.body.purchaseOrderIds ?? [],
        createdBy: (req as Request & { user?: { id?: string } }).user?.id,
      };

      const result = await this.service.addFromPurchaseOrders(data);

      res.status(201).json({
        success: true,
        data: result,
        message: `${result.created.length}건이 입고 목록에 추가되었습니다.`,
      });
    } catch (error: unknown) {
      console.error('입고 추가 오류:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '입고 추가 중 오류가 발생했습니다.',
      });
    }
  };
}
