import { Request, Response } from 'express';
import { ShopSalesSettlementLedgerService } from '../services/shopSalesSettlementLedgerService.js';
import type { SalesSettlementLedgerPartner } from '../models/shopSalesSettlementLedger.js';

function parsePartner(value: unknown): SalesSettlementLedgerPartner | null {
  if (value === 'wk' || value === 'inventio') return value;
  return null;
}

export class ShopSalesSettlementLedgerController {
  private service = new ShopSalesSettlementLedgerService();

  summary = async (_req: Request, res: Response): Promise<void> => {
    try {
      const data = await this.service.getAllSummaries();
      res.json({ success: true, data });
    } catch (error: unknown) {
      console.error('정산 장부 요약 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '정산 장부 요약 조회 중 오류가 발생했습니다.',
      });
    }
  };

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const partner = parsePartner(req.query.partner);
      if (!partner) {
        res.status(400).json({ success: false, error: 'partner(wk|inventio)가 필요합니다.' });
        return;
      }

      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
      const data = await this.service.list(partner, page, limit);
      res.json({ success: true, data });
    } catch (error: unknown) {
      console.error('정산 장부 목록 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '정산 장부 목록 조회 중 오류가 발생했습니다.',
      });
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const partner = parsePartner(req.body?.partner);
      if (!partner) {
        res.status(400).json({ success: false, error: 'partner(wk|inventio)가 필요합니다.' });
        return;
      }

      const amount = Number(req.body?.amount);
      const data = await this.service.create({
        partner,
        settlementDate: String(req.body?.settlementDate ?? ''),
        amount,
        note: req.body?.note != null ? String(req.body.note) : null,
      });
      res.status(201).json({ success: true, data, message: '정산 장부에 등록했습니다.' });
    } catch (error: unknown) {
      console.error('정산 장부 등록 오류:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '정산 장부 등록 중 오류가 발생했습니다.',
      });
    }
  };

  destroy = async (req: Request, res: Response): Promise<void> => {
    try {
      const deleted = await this.service.delete(req.params.id);
      if (!deleted) {
        res.status(404).json({ success: false, error: '장부 항목을 찾을 수 없습니다.' });
        return;
      }
      res.json({ success: true, message: '장부 항목을 삭제했습니다.' });
    } catch (error: unknown) {
      console.error('정산 장부 삭제 오류:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '정산 장부 삭제 중 오류가 발생했습니다.',
      });
    }
  };
}
