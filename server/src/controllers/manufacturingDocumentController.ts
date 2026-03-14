import { Request, Response } from 'express';
import { ManufacturingDocumentService } from '../services/manufacturingDocumentService.js';
import type { CreateManufacturingDocumentDTO, UpdateManufacturingDocumentDTO } from '../models/manufacturingDocument.js';
import fs from 'fs';

const service = new ManufacturingDocumentService();

function getUserId(req: Request): string | null {
  return (req as any).user?.id ?? null;
}

/**
 * GET /api/manufacturing-documents
 * 목록 (query: purchaseOrderId?, limit?, offset?)
 */
export async function listManufacturingDocuments(req: Request, res: Response) {
  try {
    const purchaseOrderId = (req.query.purchaseOrderId as string) || undefined;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
    const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : undefined;
    const result = await service.list(purchaseOrderId, limit, offset);
    res.json({ success: true, data: result.data, total: result.total });
  } catch (err: any) {
    console.error('Manufacturing list error:', err);
    res.status(500).json({ success: false, error: err.message || '목록 조회에 실패했습니다.' });
  }
}

/**
 * GET /api/manufacturing-documents/by-purchase-order/:purchaseOrderId
 */
export async function getByPurchaseOrderId(req: Request, res: Response) {
  try {
    const { purchaseOrderId } = req.params;
    const doc = await service.getByPurchaseOrderId(purchaseOrderId);
    if (!doc) {
      return res.status(404).json({ success: false, error: '제조 문서를 찾을 수 없습니다.' });
    }
    res.json({ success: true, data: doc });
  } catch (err: any) {
    console.error('Manufacturing getByPurchaseOrderId error:', err);
    res.status(500).json({ success: false, error: err.message || '조회에 실패했습니다.' });
  }
}

/**
 * GET /api/manufacturing-documents/:id
 */
export async function getManufacturingDocumentById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const doc = await service.getById(id);
    if (!doc) {
      return res.status(404).json({ success: false, error: '제조 문서를 찾을 수 없습니다.' });
    }
    res.json({ success: true, data: doc });
  } catch (err: any) {
    console.error('Manufacturing getById error:', err);
    res.status(500).json({ success: false, error: err.message || '조회에 실패했습니다.' });
  }
}

/**
 * POST /api/manufacturing-documents
 */
export async function createManufacturingDocument(req: Request, res: Response) {
  try {
    const dto = req.body as CreateManufacturingDocumentDTO;
    if (!dto.product_name || dto.quantity == null) {
      return res.status(400).json({ success: false, error: '제품명과 수량은 필수입니다.' });
    }
    const doc = await service.create(dto, getUserId(req));
    res.status(201).json({ success: true, data: doc });
  } catch (err: any) {
    console.error('Manufacturing create error:', err);
    res.status(500).json({ success: false, error: err.message || '생성에 실패했습니다.' });
  }
}

/**
 * PUT /api/manufacturing-documents/:id
 */
export async function updateManufacturingDocument(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const dto = req.body as UpdateManufacturingDocumentDTO;
    const doc = await service.update(id, dto, getUserId(req));
    if (!doc) {
      return res.status(404).json({ success: false, error: '제조 문서를 찾을 수 없습니다.' });
    }
    res.json({ success: true, data: doc });
  } catch (err: any) {
    console.error('Manufacturing update error:', err);
    res.status(500).json({ success: false, error: err.message || '수정에 실패했습니다.' });
  }
}

/**
 * DELETE /api/manufacturing-documents/:id
 */
export async function deleteManufacturingDocument(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const deleted = await service.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: '제조 문서를 찾을 수 없습니다.' });
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('Manufacturing delete error:', err);
    res.status(500).json({ success: false, error: err.message || '삭제에 실패했습니다.' });
  }
}

/**
 * POST /api/manufacturing-documents/upload
 * 제조 문서 파일 업로드 (엑셀 .xlsx/.xls 또는 PDF). multipart: document, optional: purchaseOrderId
 */
export async function uploadManufacturingDocument(req: Request, res: Response) {
  try {
    const file = req.file;
    if (!file?.path) {
      return res.status(400).json({ success: false, error: '엑셀(.xlsx, .xls) 또는 PDF 파일을 선택해 주세요.' });
    }
    const purchaseOrderId = (req.body.purchaseOrderId as string) || null;
    const originalFileName = (req.body.originalFileName as string)?.trim() || file.originalname || 'document.xlsx';
    const doc = await service.uploadDocument(
      file.path,
      originalFileName,
      purchaseOrderId || null,
      getUserId(req)
    );
    res.status(201).json({ success: true, data: doc });
  } catch (err: any) {
    console.error('Manufacturing document upload error:', err);
    res.status(500).json({ success: false, error: err.message || '업로드에 실패했습니다.' });
  }
}

/**
 * GET /api/manufacturing-documents/:id/download
 * 제조 문서 파일 다운로드
 */
export async function downloadManufacturingDocument(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const info = await service.getDocumentFileInfo(id);
    if (!info) {
      return res.status(404).json({ success: false, error: '제조 문서 파일을 찾을 수 없습니다.' });
    }
    if (!fs.existsSync(info.absolutePath)) {
      return res.status(404).json({ success: false, error: '파일이 존재하지 않습니다.' });
    }
    const fallback = info.originalFileName.replace(/[^\x20-\x7E]/g, '_') || 'document.xlsx';
    const encoded = encodeURIComponent(info.originalFileName);
    res.setHeader('Content-Disposition', `attachment; filename="${fallback.replace(/"/g, "'")}"; filename*=UTF-8''${encoded}`);
    res.sendFile(info.absolutePath);
  } catch (err: any) {
    console.error('Manufacturing document download error:', err);
    res.status(500).json({ success: false, error: err.message || '다운로드에 실패했습니다.' });
  }
}
