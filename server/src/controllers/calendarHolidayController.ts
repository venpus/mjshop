import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { AdminAccountRepository } from '../repositories/adminAccountRepository.js';
import { CalendarHolidayRepository } from '../repositories/calendarHolidayRepository.js';
import { logger } from '../utils/logger.js';

const adminAccountRepository = new AdminAccountRepository();
const calendarHolidayRepository = new CalendarHolidayRepository();

async function assertSuperAdmin(req: Request, res: Response): Promise<boolean> {
  const user = (req as any).user;
  if (!user?.id) {
    res.status(401).json({ error: '인증이 필요합니다.' });
    return false;
  }
  const account = await adminAccountRepository.findById(user.id);
  if (!account || account.level !== 'A-SuperAdmin') {
    res.status(403).json({ error: '일정관리는 A레벨 관리자만 사용할 수 있습니다.' });
    return false;
  }
  return true;
}

function isValidDateKey(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function parseStartEnd(body: Record<string, unknown>): { start: string; end: string } | null {
  const startRaw =
    typeof body.startDate === 'string'
      ? body.startDate.trim()
      : typeof body.start_date === 'string'
        ? body.start_date.trim()
        : '';
  const endRaw =
    typeof body.endDate === 'string'
      ? body.endDate.trim()
      : typeof body.end_date === 'string'
        ? body.end_date.trim()
        : '';
  /** 구 클라이언트 호환: holidayDate만 오면 단일일 */
  const single =
    typeof body.holidayDate === 'string'
      ? body.holidayDate.trim()
      : typeof body.holiday_date === 'string'
        ? body.holiday_date.trim()
        : '';

  let start = startRaw;
  let end = endRaw;
  if (!start && single) start = single;
  if (!end && single) end = single;
  if (!start || !end) return null;
  if (!isValidDateKey(start) || !isValidDateKey(end)) return null;
  if (end < start) {
    return { start: end, end: start };
  }
  return { start, end };
}

/**
 * GET /api/calendar-holidays?from=YYYY-MM-DD&to=YYYY-MM-DD
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

    const data = await calendarHolidayRepository.findOverlappingRange(from, to);
    return res.json({ data });
  } catch (error) {
    logger.error('공휴일 목록 조회 오류:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : '공휴일 조회 중 오류가 발생했습니다.',
    });
  }
}

/**
 * POST /api/calendar-holidays
 */
export async function create(req: Request, res: Response) {
  try {
    if (!(await assertSuperAdmin(req, res))) return;

    const user = (req as any).user;
    const body = req.body ?? {};
    const range = parseStartEnd(body);
    if (!range) {
      return res.status(400).json({
        error: 'startDate, endDate(YYYY-MM-DD)가 필요합니다. 하루만이면 동일 날짜로내면 됩니다.',
      });
    }

    const title =
      typeof body.title === 'string' ? body.title.trim().slice(0, 200) : '';

    const id = randomUUID();
    await calendarHolidayRepository.create({
      id,
      startDate: range.start,
      endDate: range.end,
      title,
      createdBy: user.id ?? null,
    });

    const row = await calendarHolidayRepository.findById(id);
    return res.status(201).json({ data: row });
  } catch (error) {
    logger.error('공휴일 등록 오류:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : '공휴일 저장 중 오류가 발생했습니다.',
    });
  }
}

/**
 * PUT /api/calendar-holidays/:id
 */
export async function update(req: Request, res: Response) {
  try {
    if (!(await assertSuperAdmin(req, res))) return;

    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: 'id가 필요합니다.' });
    }

    const body = req.body ?? {};
    const range = parseStartEnd(body);
    if (!range) {
      return res.status(400).json({
        error: 'startDate, endDate(YYYY-MM-DD)가 필요합니다.',
      });
    }

    const title =
      typeof body.title === 'string' ? body.title.trim().slice(0, 200) : '';

    const ok = await calendarHolidayRepository.update(id, {
      startDate: range.start,
      endDate: range.end,
      title,
    });
    if (!ok) {
      return res.status(404).json({ error: '공휴일을 찾을 수 없습니다.' });
    }

    const row = await calendarHolidayRepository.findById(id);
    return res.json({ data: row });
  } catch (error) {
    logger.error('공휴일 수정 오류:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : '공휴일 수정 중 오류가 발생했습니다.',
    });
  }
}

/**
 * DELETE /api/calendar-holidays/:id
 */
export async function remove(req: Request, res: Response) {
  try {
    if (!(await assertSuperAdmin(req, res))) return;

    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: 'id가 필요합니다.' });
    }

    const ok = await calendarHolidayRepository.deleteById(id);
    if (!ok) {
      return res.status(404).json({ error: '공휴일을 찾을 수 없습니다.' });
    }
    return res.json({ success: true });
  } catch (error) {
    logger.error('공휴일 삭제 오류:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : '공휴일 삭제 중 오류가 발생했습니다.',
    });
  }
}
