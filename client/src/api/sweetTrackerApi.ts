import { getApiBaseUrl } from './baseUrl';

const API_BASE = getApiBaseUrl();

export interface SweetTrackerBulkCompletedRow {
  invoiceNo: string;
  receiverName: string;
  itemName: string;
  senderName: string;
  level: number | null;
  lastKind: string;
  lastTimeString: string;
  lastWhere: string;
}

export interface SweetTrackerBulkNotCompleteRow {
  invoiceNo: string;
  receiverName: string;
  itemName: string;
  level: number | null;
  lastKind: string;
  lastTimeString: string;
  lastWhere: string;
}

export interface SweetTrackerBulkErrorRow {
  invoice: string;
  message: string;
}

export interface SweetTrackerBulkDeliveryCompletedData {
  completed: SweetTrackerBulkCompletedRow[];
  notComplete: SweetTrackerBulkNotCompleteRow[];
  errors: SweetTrackerBulkErrorRow[];
}

export interface SweetTrackerCachedInvoiceItem {
  invoiceNo: string;
  isDeliveryComplete: boolean;
  lastKind: string;
  lastWhere: string;
  /** 스위트트래커 조회 응답의 마지막 추적 시각 문자열 */
  lastTimeString: string;
  /** 연결된 패킹리스트 코드(복수) */
  packingListCodes: string[];
}

export interface SweetTrackerCachedInvoiceListData {
  items: SweetTrackerCachedInvoiceItem[];
  total: number;
  limit: number;
  offset: number;
  t_code: string;
}

export async function postSweetTrackerBulkDeliveryCompleted(
  userId: string | undefined,
  invoices: string[]
): Promise<{
  success: true;
  data: SweetTrackerBulkDeliveryCompletedData;
  meta: { t_code: string; requested: number; from_cache: number; from_api: number };
}> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (userId) headers['X-User-Id'] = userId;

  const res = await fetch(`${API_BASE}/sweet-tracker/bulk-delivery-completed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ invoices }),
  });

  const json = (await res.json()) as
    | {
        success: true;
        data: SweetTrackerBulkDeliveryCompletedData;
        meta: { t_code: string; requested: number; from_cache: number; from_api: number };
      }
    | { success: false; message?: string };

  if (!res.ok || !json.success) {
    const msg = 'message' in json && json.message ? json.message : `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return json;
}

export async function getSweetTrackerCachedInvoices(
  userId: string | undefined,
  options?: { limit?: number; offset?: number }
): Promise<{ success: true; data: SweetTrackerCachedInvoiceListData }> {
  const headers: Record<string, string> = {};
  if (userId) headers['X-User-Id'] = userId;

  const q = new URLSearchParams();
  if (options?.limit != null) q.set('limit', String(options.limit));
  if (options?.offset != null) q.set('offset', String(options.offset));
  const qs = q.toString();

  const res = await fetch(`${API_BASE}/sweet-tracker/invoice-cache${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    headers,
  });

  const json = (await res.json()) as
    | { success: true; data: SweetTrackerCachedInvoiceListData }
    | { success: false; message?: string };

  if (!res.ok || !json.success) {
    const msg = 'message' in json && json.message ? json.message : `HTTP ${res.status}`;
    throw new Error(msg);
  }

  const items = json.data.items.map((it) => {
    const row = it as SweetTrackerCachedInvoiceItem & { packingListCodes?: string[] };
    return {
      ...row,
      packingListCodes: Array.isArray(row.packingListCodes) ? row.packingListCodes : [],
    };
  });

  return { success: true as const, data: { ...json.data, items } };
}

export async function patchSweetTrackerInvoicePackingListCodes(
  userId: string | undefined,
  invoiceNo: string,
  packingListCodes: string[]
): Promise<{ success: true; data: { invoiceNo: string; packingListCodes: string[] } }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (userId) headers['X-User-Id'] = userId;

  const res = await fetch(`${API_BASE}/sweet-tracker/invoice-cache/packing-codes`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ invoiceNo, packingListCodes }),
  });

  const json = (await res.json()) as
    | { success: true; data: { invoiceNo: string; packingListCodes: string[] } }
    | { success: false; message?: string };

  if (!res.ok || !json.success) {
    const msg = 'message' in json && json.message ? json.message : `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return json;
}

/** 패킹리스트 코드로 택배 조회 캐시에 연결된 운송장 행 목록(택배 조회 목록과 동일 필드) */
export async function getSweetTrackerInvoicesByPackingListCode(
  userId: string | undefined,
  packingListCode: string
): Promise<SweetTrackerCachedInvoiceItem[]> {
  const headers: Record<string, string> = {};
  if (userId) headers['X-User-Id'] = userId;

  const q = new URLSearchParams();
  q.set('code', packingListCode);
  const res = await fetch(`${API_BASE}/sweet-tracker/invoice-cache/related-by-packing-code?${q}`, {
    method: 'GET',
    headers,
  });

  const json = (await res.json()) as
    | { success: true; data: { items?: SweetTrackerCachedInvoiceItem[] } }
    | { success: false; message?: string };

  if (!res.ok || !json.success) {
    const msg = 'message' in json && json.message ? json.message : `HTTP ${res.status}`;
    throw new Error(msg);
  }

  const rawItems = json.data.items ?? [];
  return rawItems.map((it) => {
    const row = it as SweetTrackerCachedInvoiceItem & { packingListCodes?: string[] };
    return {
      ...row,
      packingListCodes: Array.isArray(row.packingListCodes) ? row.packingListCodes : [],
    };
  });
}

function parseDelimitedTokens(raw: string, delimiterRe: RegExp): string[] {
  const parts = raw.split(delimiterRe);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const s = p.trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

/** 텍스트에서 운송장 목록 추출 (줄바꿈·쉼표·세미콜론·탭 등) */
export function parseInvoiceLines(raw: string): string[] {
  return parseDelimitedTokens(raw, /[\r\n,;，；、\t]+/);
}

/** 스위트트래커 대량 조회 입력: 쉼표(반각·전각) 또는 줄바꿈으로만 구분 */
export function parseBulkInvoiceInput(raw: string): string[] {
  return parseDelimitedTokens(raw, /[\r\n,，]+/);
}

/** 패킹리스트 코드 한 줄 입력: 쉼표(반각·전각)로만 구분, 줄바꿈은 구분자로 쓰지 않음 */
export function parsePackingListCodesInput(raw: string): string[] {
  const parts = raw.split(/[,，]/);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const s = p.replace(/\r?\n/g, ' ').trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}
