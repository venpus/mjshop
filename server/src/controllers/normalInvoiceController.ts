import { Request, Response } from 'express';
import { NormalInvoiceService } from '../services/normalInvoiceService.js';

const service = new NormalInvoiceService();

/**
 * GET /api/normal-invoices
 */
export async function listNormalInvoices(req: Request, res: Response) {
  try {
    const data = await service.list();
    res.json({ success: true, data });
  } catch (err: unknown) {
    console.error('Normal invoice list error:', err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : '목록 조회에 실패했습니다.',
    });
  }
}

/**
 * GET /api/normal-invoices/:id
 */
export async function getNormalInvoiceById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: '잘못된 ID입니다.' });
    }
    const data = await service.getById(id);
    if (!data) {
      return res.status(404).json({ success: false, error: '항목을 찾을 수 없습니다.' });
    }
    res.json({ success: true, data });
  } catch (err: unknown) {
    console.error('Normal invoice getById error:', err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : '조회에 실패했습니다.',
    });
  }
}

/**
 * POST /api/normal-invoices
 * multipart: entry_date, product_name, invoice (file, optional), photos (files, optional)
 */
export async function createNormalInvoice(req: Request, res: Response) {
  try {
    const entry_date = typeof req.body.entry_date === 'string' ? req.body.entry_date.trim() : '';
    const product_name = typeof req.body.product_name === 'string' ? req.body.product_name.trim() : '';
    if (!entry_date || !product_name) {
      return res.status(400).json({ success: false, error: '날짜와 제품명은 필수입니다.' });
    }
    const files = req.files as { invoice?: Express.Multer.File[]; photos?: Express.Multer.File[] } | undefined;
    const invoice_original_name = typeof req.body.invoice_original_name === 'string' ? req.body.invoice_original_name.trim() : undefined;
    let photo_original_names: string[] | undefined;
    try {
      const raw = req.body.photo_original_names;
      if (typeof raw === 'string' && raw) photo_original_names = JSON.parse(raw) as string[];
    } catch {
      /* ignore */
    }
    const data = await service.create({ entry_date, product_name }, files, { invoice_original_name, photo_original_names });
    res.status(201).json({ success: true, data });
  } catch (err: unknown) {
    console.error('Normal invoice create error:', err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : '등록에 실패했습니다.',
    });
  }
}

/**
 * PUT /api/normal-invoices/:id
 * multipart: entry_date?, product_name?, invoice? (file), photos? (files)
 */
export async function updateNormalInvoice(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: '잘못된 ID입니다.' });
    }
    const entry_date = typeof req.body.entry_date === 'string' ? req.body.entry_date.trim() : undefined;
    const product_name = typeof req.body.product_name === 'string' ? req.body.product_name.trim() : undefined;
    const dto = { entry_date, product_name };
    const files = req.files as { invoice?: Express.Multer.File[]; photos?: Express.Multer.File[] } | undefined;
    const invoice_original_name = typeof req.body.invoice_original_name === 'string' ? req.body.invoice_original_name.trim() : undefined;
    let photo_original_names: string[] | undefined;
    try {
      const raw = req.body.photo_original_names;
      if (typeof raw === 'string' && raw) photo_original_names = JSON.parse(raw) as string[];
    } catch {
      /* ignore */
    }
    const data = await service.update(id, dto, files, { invoice_original_name, photo_original_names });
    if (!data) {
      return res.status(404).json({ success: false, error: '항목을 찾을 수 없습니다.' });
    }
    res.json({ success: true, data });
  } catch (err: unknown) {
    console.error('Normal invoice update error:', err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : '수정에 실패했습니다.',
    });
  }
}

/**
 * DELETE /api/normal-invoices/:id
 */
export async function deleteNormalInvoice(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: '잘못된 ID입니다.' });
    }
    const deleted = await service.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: '항목을 찾을 수 없습니다.' });
    }
    res.json({ success: true });
  } catch (err: unknown) {
    console.error('Normal invoice delete error:', err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : '삭제에 실패했습니다.',
    });
  }
}
