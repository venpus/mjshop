/**
 * 스마트택배(스위트트래커) 배송조회 API — JSON
 * @see https://info.sweettracker.co.kr/apidoc (연동 문서)
 */

const TRACKING_INFO_URL = 'https://info.sweettracker.co.kr/api/v1/trackingInfo';

export interface SweetTrackerTrackingInfoJson {
  status?: boolean;
  msg?: string;
  code?: string;
  result?: string;
  level?: number;
  complete?: boolean;
  completeYN?: string;
  invoiceNo?: string;
  senderName?: string;
  receiverName?: string;
  itemName?: string;
  receiverAddr?: string;
  trackingDetails?: Array<{
    kind?: string;
    timeString?: string;
    where?: string;
    level?: number;
  }>;
  lastDetail?: { kind?: string; timeString?: string; where?: string; level?: number };
}

export type SweetTrackerFetchResult =
  | { ok: true; data: SweetTrackerTrackingInfoJson }
  | { ok: false; errorMessage: string; raw?: unknown };

function parseJsonSafe(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/** API가 조회에 성공했는지 (운송장·택배사 유효, 본문에 추적 정보가 온 경우) */
export function isSweetTrackerLookupSuccess(body: SweetTrackerTrackingInfoJson): boolean {
  if (body.status === false) return false;
  if (body.result === 'N') return false;
  if (body.result === 'Y') return true;
  if (body.status === true) return true;
  if (body.invoiceNo != null && body.invoiceNo !== '' && (body.level != null || (body.trackingDetails?.length ?? 0) > 0)) {
    return true;
  }
  return false;
}

/**
 * 배송완료 여부 (공식/블로그 정리: level 6 = 배송완료, complete, completeYN 보조)
 */
export function isSweetTrackerDeliveryComplete(body: SweetTrackerTrackingInfoJson): boolean {
  if (!isSweetTrackerLookupSuccess(body)) return false;
  if (body.complete === true) return true;
  if (body.completeYN === 'Y') return true;
  const lv = Number(body.level);
  if (lv === 6) return true;
  const last =
    body.lastDetail ??
    (body.trackingDetails?.length
      ? body.trackingDetails[body.trackingDetails.length - 1]
      : undefined);
  if (last?.kind?.includes('배송완료')) return true;
  return false;
}

export function summarizeLastTracking(body: SweetTrackerTrackingInfoJson): {
  kind: string;
  timeString: string;
  where: string;
} {
  const last =
    body.lastDetail ??
    (body.trackingDetails?.length
      ? body.trackingDetails[body.trackingDetails.length - 1]
      : undefined);
  return {
    kind: last?.kind ?? '',
    timeString: last?.timeString ?? '',
    where: last?.where ?? '',
  };
}

export async function fetchTrackingInfo(
  apiKey: string,
  tCode: string,
  invoice: string
): Promise<SweetTrackerFetchResult> {
  const inv = invoice.trim();
  if (!inv) {
    return { ok: false, errorMessage: '운송장 번호가 비어 있습니다.' };
  }
  const url = new URL(TRACKING_INFO_URL);
  url.searchParams.set('t_key', apiKey);
  url.searchParams.set('t_code', tCode.trim());
  url.searchParams.set('t_invoice', inv);

  let res: Response;
  try {
    res = await fetch(url.toString(), { method: 'GET' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, errorMessage: `네트워크 오류: ${msg}` };
  }

  const text = await res.text();
  const raw = parseJsonSafe(text);
  if (raw === null || typeof raw !== 'object') {
    return { ok: false, errorMessage: '응답 파싱 실패', raw: text.slice(0, 200) };
  }
  const body = raw as SweetTrackerTrackingInfoJson;

  if (!res.ok) {
    return { ok: false, errorMessage: body.msg ?? `HTTP ${res.status}`, raw: body };
  }

  if (body.status === false) {
    return { ok: false, errorMessage: body.msg ?? '조회 실패', raw: body };
  }
  if (body.result === 'N') {
    return { ok: false, errorMessage: body.msg ?? '조회 결과 없음(N)', raw: body };
  }

  return { ok: true, data: body };
}

export interface BulkCompletedRow {
  invoiceNo: string;
  receiverName: string;
  itemName: string;
  senderName: string;
  level: number | null;
  lastKind: string;
  lastTimeString: string;
  lastWhere: string;
}

export interface BulkNotCompleteRow {
  invoiceNo: string;
  receiverName: string;
  itemName: string;
  level: number | null;
  lastKind: string;
  lastTimeString: string;
  lastWhere: string;
}

export interface BulkErrorRow {
  invoice: string;
  message: string;
}

export interface BulkDeliveryCompletedResult {
  completed: BulkCompletedRow[];
  notComplete: BulkNotCompleteRow[];
  errors: BulkErrorRow[];
}

const DEFAULT_CONCURRENCY = 4;
const DELAY_MS = 150;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function bulkFetchDeliveryCompleted(
  apiKey: string,
  tCode: string,
  invoices: string[],
  options?: {
    concurrency?: number;
    delayMs?: number;
    /** 조회 성공 시(완료/미완료 모두) 스냅샷 저장 등에 사용 — 동일 응답으로 추가 API 호출 방지 */
    onLookupSuccess?: (
      invoice: string,
      data: SweetTrackerTrackingInfoJson,
      isDeliveryComplete: boolean
    ) => void | Promise<void>;
  }
): Promise<BulkDeliveryCompletedResult> {
  const concurrency = options?.concurrency ?? DEFAULT_CONCURRENCY;
  const delayMs = options?.delayMs ?? DELAY_MS;
  const onLookupSuccess = options?.onLookupSuccess;

  const completed: BulkCompletedRow[] = [];
  const notComplete: BulkNotCompleteRow[] = [];
  const errors: BulkErrorRow[] = [];

  let cursor = 0;

  async function worker(): Promise<void> {
    while (true) {
      const i = cursor++;
      if (i >= invoices.length) return;
      const invoice = invoices[i]!;
      if (delayMs > 0 && i > 0) await sleep(delayMs);

      const result = await fetchTrackingInfo(apiKey, tCode, invoice);
      if (!result.ok) {
        errors.push({ invoice, message: result.errorMessage });
        continue;
      }
      const data = result.data;
      const invNo = (data.invoiceNo ?? invoice).trim();
      const last = summarizeLastTracking(data);
      const isDeliveryComplete = isSweetTrackerDeliveryComplete(data);

      if (isDeliveryComplete) {
        completed.push({
          invoiceNo: invNo,
          receiverName: data.receiverName ?? '',
          itemName: data.itemName ?? '',
          senderName: data.senderName ?? '',
          level: data.level ?? null,
          lastKind: last.kind,
          lastTimeString: last.timeString,
          lastWhere: last.where,
        });
      } else {
        notComplete.push({
          invoiceNo: invNo,
          receiverName: data.receiverName ?? '',
          itemName: data.itemName ?? '',
          level: data.level ?? null,
          lastKind: last.kind,
          lastTimeString: last.timeString,
          lastWhere: last.where,
        });
      }

      if (onLookupSuccess) {
        await onLookupSuccess(invoice, data, isDeliveryComplete);
      }
    }
  }

  const pool = Math.min(concurrency, Math.max(1, invoices.length));
  await Promise.all(Array.from({ length: pool }, () => worker()));

  completed.sort((a, b) => a.invoiceNo.localeCompare(b.invoiceNo, 'ko'));
  return { completed, notComplete, errors };
}
