import type { Request, Response } from 'express';
import {
  SweetTrackerInvoiceCacheRepository,
  type SweetTrackerInvoiceCacheListRow,
} from '../repositories/sweetTrackerInvoiceCacheRepository.js';
import { bulkResolveTrackingWithCache } from '../services/sweetTrackerBulkCacheService.js';

const MAX_INVOICES = 150;
/** 로컬·기존 테스트와 동일 키 — 운영에서는 SWEET_TRACKER_API_KEY 환경변수 사용 권장 */
const FALLBACK_API_KEY = '6oxGctW6rrSzxm5kOP631A';
const DEFAULT_T_CODE = '04';

const MAX_CACHE_LIST_LIMIT = 500;
const DEFAULT_CACHE_LIST_LIMIT = 200;
const MAX_PACKING_LIST_CODES = 40;
/** code::YYYY-MM-DD 또는 code::id:n 형태 허용 */
const MAX_PACKING_LIST_CODE_LEN = 180;

const sweetTrackerInvoiceCacheRepository = new SweetTrackerInvoiceCacheRepository();

function getApiKey(): string {
  const fromEnv = process.env.SWEET_TRACKER_API_KEY?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : FALLBACK_API_KEY;
}

function normalizeInvoices(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of list) {
    if (typeof x !== 'string') continue;
    const s = x.trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function parsePackingListCodesJson(raw: string | null | undefined): string[] {
  if (raw == null || !String(raw).trim()) return [];
  try {
    const v = JSON.parse(String(raw)) as unknown;
    if (!Array.isArray(v)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const x of v) {
      if (typeof x !== 'string') continue;
      const s = x.trim();
      if (!s || seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
    return out;
  } catch {
    return [];
  }
}

function normalizePackingListCodesFromBody(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of input) {
    if (typeof x !== 'string') continue;
    const s = x.trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

/**
 * POST /api/sweet-tracker/bulk-delivery-completed
 * body: { invoices: string[], t_code?: string }
 */
export async function postBulkDeliveryCompleted(req: Request, res: Response): Promise<void> {
  const user = (req as { user?: { id?: string } }).user;
  if (!user?.id) {
    res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    return;
  }

  const body = req.body as { invoices?: unknown; t_code?: unknown };
  const invoices = normalizeInvoices(body.invoices);
  if (invoices.length === 0) {
    res.status(400).json({ success: false, message: '운송장 번호를 하나 이상 입력해 주세요.' });
    return;
  }
  if (invoices.length > MAX_INVOICES) {
    res.status(400).json({
      success: false,
      message: `한 번에 최대 ${MAX_INVOICES}건까지 조회할 수 있습니다.`,
    });
    return;
  }

  const tCode =
    typeof body.t_code === 'string' && body.t_code.trim() !== ''
      ? body.t_code.trim()
      : DEFAULT_T_CODE;

  try {
    const { result, meta: cacheMeta } = await bulkResolveTrackingWithCache(
      getApiKey(),
      tCode,
      invoices,
      sweetTrackerInvoiceCacheRepository
    );
    res.json({
      success: true,
      data: result,
      meta: {
        t_code: tCode,
        requested: invoices.length,
        from_cache: cacheMeta.from_cache,
        from_api: cacheMeta.from_api,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ success: false, message: msg });
  }
}

/**
 * GET /api/sweet-tracker/invoice-cache?limit=&offset=
 * 고정 택배사 코드(04) 기준 DB에 저장된 운송장 캐시 목록
 */
export async function getCachedInvoiceList(req: Request, res: Response): Promise<void> {
  const user = (req as { user?: { id?: string } }).user;
  if (!user?.id) {
    res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    return;
  }

  const rawLimit = parseInt(String(req.query.limit ?? ''), 10);
  const rawOffset = parseInt(String(req.query.offset ?? ''), 10);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(MAX_CACHE_LIST_LIMIT, Math.max(1, rawLimit))
    : DEFAULT_CACHE_LIST_LIMIT;
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
  const rawFilter =
    typeof req.query.deliveryComplete === 'string' ? req.query.deliveryComplete.trim().toLowerCase() : '';
  const deliveryComplete =
    rawFilter === 'complete' || rawFilter === 'completed' || rawFilter === '1' || rawFilter === 'true'
      ? true
      : rawFilter === 'not_complete' || rawFilter === 'not-complete' || rawFilter === '0' || rawFilter === 'false'
        ? false
        : undefined;
  const invoiceNoQuery = typeof req.query.invoiceNo === 'string' ? req.query.invoiceNo.trim() : '';

  try {
    const { rows, total } = await sweetTrackerInvoiceCacheRepository.listByTCodePaged(
      DEFAULT_T_CODE,
      limit,
      offset,
      deliveryComplete === undefined && !invoiceNoQuery
        ? undefined
        : { deliveryComplete, invoiceNoQuery: invoiceNoQuery || undefined }
    );
    res.json({
      success: true,
      data: {
        items: rows.map((r) => ({
          invoiceNo: r.invoice_no,
          isDeliveryComplete: Number(r.is_delivery_complete) === 1,
          lastKind: r.last_kind ?? '',
          lastWhere: r.last_where ?? '',
          lastTimeString: r.last_time_string ?? '',
          packingListCodes: parsePackingListCodesJson(r.packing_list_codes_json),
        })),
        total,
        limit,
        offset,
        t_code: DEFAULT_T_CODE,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ success: false, message: msg });
  }
}

/**
 * GET /api/sweet-tracker/invoice-cache/related-by-packing-code?code=
 * 패킹리스트 코드로 스위트트래커 캐시에 연결된 운송장 번호 목록
 */
export async function getRelatedInvoicesByPackingListCode(req: Request, res: Response): Promise<void> {
  const user = (req as { user?: { id?: string } }).user;
  if (!user?.id) {
    res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    return;
  }

  const raw = typeof req.query.code === 'string' ? req.query.code.trim() : '';
  if (!raw) {
    res.status(400).json({ success: false, message: '패킹리스트 코드(code)가 필요합니다.' });
    return;
  }
  if (raw.length > MAX_PACKING_LIST_CODE_LEN) {
    res.status(400).json({ success: false, message: '패킹리스트 코드가 너무 깁니다.' });
    return;
  }

  try {
    const invoiceNos = await sweetTrackerInvoiceCacheRepository.listInvoiceNosByPackingListCode(
      DEFAULT_T_CODE,
      raw
    );
    let items: Array<{
      invoiceNo: string;
      isDeliveryComplete: boolean;
      lastKind: string;
      lastWhere: string;
      lastTimeString: string;
      packingListCodes: string[];
    }> = [];
    if (invoiceNos.length > 0) {
      const rows = await sweetTrackerInvoiceCacheRepository.listRowsByTCodeAndInvoiceNos(
        DEFAULT_T_CODE,
        invoiceNos
      );
      const map = new Map(rows.map((r) => [r.invoice_no, r]));
      items = invoiceNos
        .map((no) => map.get(no))
        .filter((r): r is SweetTrackerInvoiceCacheListRow => r != null)
        .map((r) => ({
          invoiceNo: r.invoice_no,
          isDeliveryComplete: Number(r.is_delivery_complete) === 1,
          lastKind: r.last_kind ?? '',
          lastWhere: r.last_where ?? '',
          lastTimeString: r.last_time_string ?? '',
          packingListCodes: parsePackingListCodesJson(r.packing_list_codes_json),
        }));
    }
    res.json({
      success: true,
      data: {
        packingListCode: raw,
        invoiceNos,
        items,
        t_code: DEFAULT_T_CODE,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ success: false, message: msg });
  }
}

/**
 * PATCH /api/sweet-tracker/invoice-cache/packing-codes
 * body: { invoiceNo: string, packingListCodes: string[] }
 */
export async function patchInvoicePackingListCodes(req: Request, res: Response): Promise<void> {
  const user = (req as { user?: { id?: string } }).user;
  if (!user?.id) {
    res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    return;
  }

  const body = req.body as { invoiceNo?: unknown; packingListCodes?: unknown };
  const invoiceNo = typeof body.invoiceNo === 'string' ? body.invoiceNo.trim() : '';
  if (!invoiceNo) {
    res.status(400).json({ success: false, message: '운송장 번호가 필요합니다.' });
    return;
  }

  const codes = normalizePackingListCodesFromBody(body.packingListCodes);
  if (codes.length > MAX_PACKING_LIST_CODES) {
    res.status(400).json({
      success: false,
      message: `패킹리스트 코드는 최대 ${MAX_PACKING_LIST_CODES}개까지 입력할 수 있습니다.`,
    });
    return;
  }
  for (const c of codes) {
    if (c.length > MAX_PACKING_LIST_CODE_LEN) {
      res.status(400).json({
        success: false,
        message: `패킹리스트 코드는 각각 최대 ${MAX_PACKING_LIST_CODE_LEN}자까지입니다.`,
      });
      return;
    }
  }

  try {
    const ok = await sweetTrackerInvoiceCacheRepository.updatePackingListCodesByTCodeAndInvoice(
      DEFAULT_T_CODE,
      invoiceNo,
      codes
    );
    if (!ok) {
      res.status(404).json({
        success: false,
        message: '해당 운송장이 목록에 없습니다. 먼저 대량 조회로 캐시를 만든 뒤 저장해 주세요.',
      });
      return;
    }
    res.json({ success: true, data: { invoiceNo, packingListCodes: codes } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ success: false, message: msg });
  }
}
