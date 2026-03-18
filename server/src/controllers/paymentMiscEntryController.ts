import { Request, Response } from 'express';
import { PaymentMiscEntryService } from '../services/paymentMiscEntryService.js';

export class PaymentMiscEntryController {
  private service = new PaymentMiscEntryService();

  summary = async (_req: Request, res: Response) => {
    try {
      const total_cny = await this.service.getTotalCny();
      res.json({ success: true, data: { total_cny } });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '조회 실패';
      res.status(500).json({ success: false, error: msg });
    }
  };

  list = async (_req: Request, res: Response) => {
    try {
      const data = await this.service.list();
      res.json({ success: true, data });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '조회 실패';
      res.status(500).json({ success: false, error: msg });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const row = await this.service.create(req.body || {});
      res.status(201).json({ success: true, data: row });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '생성 실패';
      res.status(500).json({ success: false, error: msg });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: '잘못된 ID' });
        return;
      }
      const row = await this.service.update(id, req.body || {});
      if (!row) {
        res.status(404).json({ success: false, error: '항목을 찾을 수 없습니다.' });
        return;
      }
      res.json({ success: true, data: row });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '수정 실패';
      res.status(500).json({ success: false, error: msg });
    }
  };

  uploadFile = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: '잘못된 ID' });
        return;
      }
      const file = req.file;
      if (!file) {
        res.status(400).json({ success: false, error: '파일이 없습니다.' });
        return;
      }
      const row = await this.service.attachFile(id, file.path, file.originalname);
      if (!row) {
        res.status(404).json({ success: false, error: '항목을 찾을 수 없습니다.' });
        return;
      }
      res.json({ success: true, data: row });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '업로드 실패';
      res.status(500).json({ success: false, error: msg });
    }
  };

  removeFile = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: '잘못된 ID' });
        return;
      }
      const row = await this.service.removeFile(id);
      if (!row) {
        res.status(404).json({ success: false, error: '항목을 찾을 수 없습니다.' });
        return;
      }
      res.json({ success: true, data: row });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '처리 실패';
      res.status(500).json({ success: false, error: msg });
    }
  };

  destroy = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: '잘못된 ID' });
        return;
      }
      const ok = await this.service.deleteEntry(id);
      if (!ok) {
        res.status(404).json({ success: false, error: '항목을 찾을 수 없습니다.' });
        return;
      }
      res.json({ success: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '삭제 실패';
      res.status(500).json({ success: false, error: msg });
    }
  };
}
