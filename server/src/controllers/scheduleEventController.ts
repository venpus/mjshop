import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { AdminAccountRepository } from '../repositories/adminAccountRepository.js';
import { ScheduleEventRepository } from '../repositories/scheduleEventRepository.js';
import { PurchaseOrderRepository } from '../repositories/purchaseOrderRepository.js';
import type { ScheduleEventKind } from '../models/scheduleEvent.js';
import { logger } from '../utils/logger.js';

const adminAccountRepository = new AdminAccountRepository();
const scheduleEventRepository = new ScheduleEventRepository();
const purchaseOrderRepository = new PurchaseOrderRepository();

const KINDS: ScheduleEventKind[] = ['production', 'shipment', 'other'];

function requireSuperAdmin(req: Request, res: Response): boolean {
  const user = (req as any).user;
  if (!user?.id) {
    res.status(401).json({ error: '인증이 필요합니다.' });
    return false;
  }
  return true;
}

async function assertSuperAdmin(req: Request, res: Response): Promise<boolean> {
  if (!requireSuperAdmin(req, res)) return false;
  const user = (req as any).user;
  const account = await adminAccountRepository.findById(user.id);
  if (!account || account.level !== 'A-SuperAdmin') {
    res.status(403).json({ error: '일정관리는 A레벨 관리자만 사용할 수 있습니다.' });
    return false;
  }
  return true;
}

function normalizeRange(body: { startDateKey?: string; endDateKey?: string }): {
  start: string;
  end: string;
} | null {
  const start = body.startDateKey?.trim();
  const end = body.endDateKey?.trim();
  if (!start || !end) return null;
  if (end < start) return { start: end, end: start };
  return { start, end };
}

function isValidDateKey(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** 생산/출고 유형일 때만 발주 ID 저장. 존재하지 않으면 400. */
async function resolvePurchaseOrderId(
  body: Record<string, unknown>,
  kind: ScheduleEventKind,
): Promise<{ purchaseOrderId: string | null; error?: string }> {
  const raw =
    typeof body.purchaseOrderId === 'string' && body.purchaseOrderId.trim()
      ? body.purchaseOrderId.trim()
      : null;
  if (kind === 'other') {
    return { purchaseOrderId: null };
  }
  if (!raw) {
    return { purchaseOrderId: null };
  }
  const po = await purchaseOrderRepository.findById(raw);
  if (!po) {
    return { purchaseOrderId: null, error: '연결할 발주를 찾을 수 없습니다.' };
  }
  return { purchaseOrderId: raw };
}

/**
 * GET /api/schedule-events?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function list(req: Request, res: Response) {
  try {
    if (!(await assertSuperAdmin(req, res))) return;

    const from = typeof req.query.from === 'string' ? req.query.from.trim() : '';
    const to = typeof req.query.to === 'string' ? req.query.to.trim() : '';
    if (!from || !to || !isValidDateKey(from) || !isValidDateKey(to)) {
      return res.status(400).json({ error: 'from, to (YYYY-MM-DD)가 필요합니다.' });
    }
    if (to < from) {
      return res.status(400).json({ error: 'to는 from 이상이어야 합니다.' });
    }

    const data = await scheduleEventRepository.findOverlappingRange(from, to);
    return res.json({ data });
  } catch (error) {
    logger.error('일정 목록 조회 오류:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : '일정 조회 중 오류가 발생했습니다.',
    });
  }
}

/**
 * POST /api/schedule-events
 */
export async function create(req: Request, res: Response) {
  try {
    if (!(await assertSuperAdmin(req, res))) return;

    const user = (req as any).user;
    const body = req.body ?? {};
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) {
      return res.status(400).json({ error: '제목이 필요합니다.' });
    }

    const range = normalizeRange(body);
    if (!range || !isValidDateKey(range.start) || !isValidDateKey(range.end)) {
      return res.status(400).json({ error: 'startDateKey, endDateKey(YYYY-MM-DD)가 필요합니다.' });
    }

    const kind = body.kind as ScheduleEventKind;
    if (!KINDS.includes(kind)) {
      return res.status(400).json({ error: '유형이 올바르지 않습니다.' });
    }

    const note =
      typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null;

    let id =
      typeof body.id === 'string' && body.id.trim().length > 0 ? body.id.trim() : randomUUID();
    if (id.length > 64) {
      return res.status(400).json({ error: 'id는 64자 이하여야 합니다.' });
    }

    const existing = await scheduleEventRepository.findById(id);
    if (existing) {
      id = randomUUID();
    }

    const poResolved = await resolvePurchaseOrderId(body, kind);
    if (poResolved.error) {
      return res.status(400).json({ error: poResolved.error });
    }

    await scheduleEventRepository.create({
      id,
      title,
      startDateKey: range.start,
      endDateKey: range.end,
      kind,
      note,
      purchaseOrderId: poResolved.purchaseOrderId,
      createdBy: user.id ?? null,
    });

    const created = await scheduleEventRepository.findById(id);
    return res.status(201).json({ data: created });
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: '이미 존재하는 일정 ID입니다.' });
    }
    logger.error('일정 생성 오류:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : '일정 저장 중 오류가 발생했습니다.',
    });
  }
}

/**
 * PUT /api/schedule-events/:id
 */
export async function update(req: Request, res: Response) {
  try {
    if (!(await assertSuperAdmin(req, res))) return;

    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: 'id가 필요합니다.' });
    }

    const body = req.body ?? {};
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) {
      return res.status(400).json({ error: '제목이 필요합니다.' });
    }

    const range = normalizeRange(body);
    if (!range || !isValidDateKey(range.start) || !isValidDateKey(range.end)) {
      return res.status(400).json({ error: 'startDateKey, endDateKey(YYYY-MM-DD)가 필요합니다.' });
    }

    const kind = body.kind as ScheduleEventKind;
    if (!KINDS.includes(kind)) {
      return res.status(400).json({ error: '유형이 올바르지 않습니다.' });
    }

    const note =
      typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null;

    const poResolved = await resolvePurchaseOrderId(body, kind);
    if (poResolved.error) {
      return res.status(400).json({ error: poResolved.error });
    }

    const ok = await scheduleEventRepository.update(id, {
      title,
      startDateKey: range.start,
      endDateKey: range.end,
      kind,
      note,
      purchaseOrderId: poResolved.purchaseOrderId,
    });
    if (!ok) {
      return res.status(404).json({ error: '일정을 찾을 수 없습니다.' });
    }
    const updated = await scheduleEventRepository.findById(id);
    return res.json({ data: updated });
  } catch (error) {
    logger.error('일정 수정 오류:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : '일정 수정 중 오류가 발생했습니다.',
    });
  }
}

/**
 * DELETE /api/schedule-events/:id
 */
export async function remove(req: Request, res: Response) {
  try {
    if (!(await assertSuperAdmin(req, res))) return;

    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: 'id가 필요합니다.' });
    }

    const ok = await scheduleEventRepository.deleteById(id);
    if (!ok) {
      return res.status(404).json({ error: '일정을 찾을 수 없습니다.' });
    }
    return res.json({ success: true });
  } catch (error) {
    logger.error('일정 삭제 오류:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : '일정 삭제 중 오류가 발생했습니다.',
    });
  }
}
