import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { AdminAccountRepository } from '../repositories/adminAccountRepository.js';
import { ScheduleEventRepository } from '../repositories/scheduleEventRepository.js';
import { PurchaseOrderRepository } from '../repositories/purchaseOrderRepository.js';
import type { ScheduleEventKind } from '../models/scheduleEvent.js';
import { logger } from '../utils/logger.js';
import { addCalendarDaysToDateKey } from '../utils/scheduleDateKey.js';

const adminAccountRepository = new AdminAccountRepository();
const scheduleEventRepository = new ScheduleEventRepository();
const purchaseOrderRepository = new PurchaseOrderRepository();

const ALL_KINDS: ScheduleEventKind[] = [
  'production',
  'shipment',
  'other',
  'logistics_dispatch',
  'korea_arrival_expected',
];

type CreatableScheduleKind = Exclude<ScheduleEventKind, 'korea_arrival_expected'>;

const CREATABLE_KINDS: readonly CreatableScheduleKind[] = [
  'production',
  'shipment',
  'other',
  'logistics_dispatch',
];

function isCreatableScheduleKind(k: ScheduleEventKind): k is CreatableScheduleKind {
  return CREATABLE_KINDS.includes(k as CreatableScheduleKind);
}

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

function parseTransitDaysFromBody(body: Record<string, unknown>): { days: number; error?: string } {
  const raw = body.transitDays;
  if (raw === undefined || raw === null || raw === '') {
    return { days: NaN, error: '배송 소요일이 필요합니다.' };
  }
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  if (!Number.isInteger(n) || n < 0 || n > 3650) {
    return { days: NaN, error: '배송 소요일은 0~3650일 사이의 정수여야 합니다.' };
  }
  return { days: n };
}

function arrivalTitleFromPoNumber(poNumber: string): string {
  const n = poNumber?.trim() || '?';
  return `한국도착 예정 · ${n}`;
}

async function resolvePurchaseOrderForSchedule(
  body: Record<string, unknown>,
  kind: ScheduleEventKind,
): Promise<{ purchaseOrderId: string | null; error?: string }> {
  const raw =
    typeof body.purchaseOrderId === 'string' && body.purchaseOrderId.trim()
      ? body.purchaseOrderId.trim()
      : null;
  if (kind === 'other' || kind === 'korea_arrival_expected') {
    return { purchaseOrderId: null };
  }
  if (kind === 'logistics_dispatch') {
    if (!raw) {
      return { purchaseOrderId: null, error: '한국출발 일정에는 발주를 선택해야 합니다.' };
    }
    const po = await purchaseOrderRepository.findById(raw);
    if (!po) {
      return { purchaseOrderId: null, error: '연결할 발주를 찾을 수 없습니다.' };
    }
    const onList = await purchaseOrderRepository.isPurchaseOrderOnPackingList(raw);
    if (!onList) {
      return { purchaseOrderId: null, error: '패킹리스트에 등록된 발주만 선택할 수 있습니다.' };
    }
    return { purchaseOrderId: raw };
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
 * GET /api/schedule-events/:id
 */
export async function getById(req: Request, res: Response) {
  try {
    if (!(await assertSuperAdmin(req, res))) return;
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: 'id가 필요합니다.' });
    }
    const row = await scheduleEventRepository.findById(id);
    if (!row) {
      return res.status(404).json({ error: '일정을 찾을 수 없습니다.' });
    }
    return res.json({ data: row });
  } catch (error) {
    logger.error('일정 단건 조회 오류:', error);
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
    if (!isCreatableScheduleKind(kind)) {
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

    const poResolved = await resolvePurchaseOrderForSchedule(body, kind);
    if (poResolved.error) {
      return res.status(400).json({ error: poResolved.error });
    }

    if (kind === 'logistics_dispatch') {
      const { days: transitDays, error: tdErr } = parseTransitDaysFromBody(body);
      if (tdErr) {
        return res.status(400).json({ error: tdErr });
      }
      const poId = poResolved.purchaseOrderId as string;
      const poRow = await purchaseOrderRepository.findById(poId);
      const poNumber = poRow?.po_number?.trim() || poId;
      const pairId = randomUUID();
      const arrivalId = randomUUID();
      const arrivalKey = addCalendarDaysToDateKey(range.end, transitDays);

      await scheduleEventRepository.createLogisticsDispatchWithArrival({
        dispatchId: id,
        arrivalId,
        pairId,
        titleDispatch: title,
        titleArrival: arrivalTitleFromPoNumber(poNumber),
        dispatchStart: range.start,
        dispatchEnd: range.end,
        arrivalDateKey: arrivalKey,
        transitDays,
        purchaseOrderId: poId,
        note,
        createdBy: user.id ?? null,
      });

      const created = await scheduleEventRepository.findById(id);
      return res.status(201).json({ data: created, pairedDateKey: arrivalKey });
    }

    await scheduleEventRepository.create({
      id,
      title,
      startDateKey: range.start,
      endDateKey: range.end,
      kind,
      note,
      purchaseOrderId: poResolved.purchaseOrderId,
      pairId: null,
      transitDays: null,
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
    if (!ALL_KINDS.includes(kind)) {
      return res.status(400).json({ error: '유형이 올바르지 않습니다.' });
    }

    const note =
      typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null;

    const existing = await scheduleEventRepository.findById(id);
    if (!existing) {
      return res.status(404).json({ error: '일정을 찾을 수 없습니다.' });
    }

    if (existing.kind === 'korea_arrival_expected') {
      return res
        .status(400)
        .json({ error: '한국도착 예정 일정은 한국출발 일정에서만 수정할 수 있습니다.' });
    }

    if (existing.kind === 'logistics_dispatch') {
      if (kind !== 'logistics_dispatch') {
        return res.status(400).json({ error: '한국출발 일정의 유형은 변경할 수 없습니다.' });
      }
      const { days: transitDays, error: tdErr } = parseTransitDaysFromBody(body);
      if (tdErr) {
        return res.status(400).json({ error: tdErr });
      }
      const poResolved = await resolvePurchaseOrderForSchedule(body, kind);
      if (poResolved.error) {
        return res.status(400).json({ error: poResolved.error });
      }
      const poId = poResolved.purchaseOrderId as string;
      const poRow = await purchaseOrderRepository.findById(poId);
      const poNumber = poRow?.po_number?.trim() || poId;
      const arrivalKey = addCalendarDaysToDateKey(range.end, transitDays);

      const ok = await scheduleEventRepository.update(id, {
        title,
        startDateKey: range.start,
        endDateKey: range.end,
        kind,
        note,
        purchaseOrderId: poId,
        transitDays,
      });
      if (!ok) {
        return res.status(404).json({ error: '일정을 찾을 수 없습니다.' });
      }

      if (existing.pairId) {
        await scheduleEventRepository.updateArrivalForPair(existing.pairId, {
          startDateKey: arrivalKey,
          endDateKey: arrivalKey,
          title: arrivalTitleFromPoNumber(poNumber),
          purchaseOrderId: poId,
          note,
        });
      }

      const updated = await scheduleEventRepository.findById(id);
      return res.json({ data: updated, pairedDateKey: arrivalKey });
    }

    const poResolved = await resolvePurchaseOrderForSchedule(body, kind);
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
      transitDays: null,
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
