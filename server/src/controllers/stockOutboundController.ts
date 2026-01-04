import { Request, Response } from 'express';
import { StockOutboundService } from '../services/stockOutboundService.js';
import { CreateStockOutboundRecordDTO, UpdateStockOutboundRecordDTO } from '../models/stockOutbound.js';

export class StockOutboundController {
  private service: StockOutboundService;

  constructor() {
    this.service = new StockOutboundService();
  }

  /**
   * groupKey로 출고 기록 목록 조회
   * GET /api/stock-outbound/:groupKey
   */
  getRecordsByGroupKey = async (req: Request, res: Response): Promise<void> => {
    try {
      const { groupKey } = req.params;
      const decodedGroupKey = decodeURIComponent(groupKey);

      const records = await this.service.getRecordsByGroupKey(decodedGroupKey);

      res.json({
        success: true,
        data: records,
      });
    } catch (error: any) {
      console.error('출고 기록 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '출고 기록 조회 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 출고 기록 생성
   * POST /api/stock-outbound
   */
  createRecord = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: CreateStockOutboundRecordDTO = {
        groupKey: req.body.groupKey,
        outboundDate: req.body.outboundDate,
        customerName: req.body.customerName,
        quantity: req.body.quantity,
        createdBy: (req as any).user?.id,
      };

      const record = await this.service.createRecord(data);

      res.status(201).json({
        success: true,
        data: record,
      });
    } catch (error: any) {
      console.error('출고 기록 생성 오류:', error);
      res.status(400).json({
        success: false,
        error: error.message || '출고 기록 생성 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 출고 기록 수정
   * PUT /api/stock-outbound/:id
   */
  updateRecord = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const recordId = parseInt(id, 10);

      if (isNaN(recordId)) {
        res.status(400).json({
          success: false,
          error: '유효하지 않은 ID입니다.',
        });
        return;
      }

      const data: UpdateStockOutboundRecordDTO = {
        outboundDate: req.body.outboundDate,
        customerName: req.body.customerName,
        quantity: req.body.quantity,
        updatedBy: (req as any).user?.id,
      };

      const record = await this.service.updateRecord(recordId, data);

      res.json({
        success: true,
        data: record,
      });
    } catch (error: any) {
      console.error('출고 기록 수정 오류:', error);
      res.status(400).json({
        success: false,
        error: error.message || '출고 기록 수정 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 출고 기록 삭제
   * DELETE /api/stock-outbound/:id
   */
  deleteRecord = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const recordId = parseInt(id, 10);

      if (isNaN(recordId)) {
        res.status(400).json({
          success: false,
          error: '유효하지 않은 ID입니다.',
        });
        return;
      }

      await this.service.deleteRecord(recordId);

      res.json({
        success: true,
        message: '출고 기록이 삭제되었습니다.',
      });
    } catch (error: any) {
      console.error('출고 기록 삭제 오류:', error);
      res.status(400).json({
        success: false,
        error: error.message || '출고 기록 삭제 중 오류가 발생했습니다.',
      });
    }
  };
}

