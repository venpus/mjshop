/**
 * 쇼핑몰 배송관리 전용 송장 조회 (스위트트래커 API)
 * 택배조회(sweetTrackerService)와 API 키(SWEET_TRACKER_API_KEY)만 공유하고,
 * 조회 로직·캐시·라우트는 분리합니다.
 */

import {
  SHOP_LOGISTICS_T_CODE_LOGEN,
  ShopShipmentDeliveryStatus,
} from '../models/shopShipment.js';
import { ShopShipmentRepository } from '../repositories/shopShipmentRepository.js';
import { ShopOrderLineRepository } from '../repositories/shopOrderLineRepository.js';

const SHOP_TRACKING_INFO_URL = 'https://info.sweettracker.co.kr/api/v1/trackingInfo';
/** sweetTrackerController와 동일 — SWEET_TRACKER_API_KEY 미설정 시 로컬 fallback */
const SWEET_TRACKER_FALLBACK_API_KEY = '6oxGctW6rrSzxm5kOP631A';

export interface ShopShipmentTrackingInfoJson {
  status?: boolean;
  msg?: string;
  code?: string;
  result?: string;
  level?: number;
  complete?: boolean;
  completeYN?: string;
  invoiceNo?: string;
  trackingDetails?: Array<{
    kind?: string;
    timeString?: string;
    where?: string;
    level?: number;
  }>;
  lastDetail?: { kind?: string; timeString?: string; where?: string; level?: number };
}

export type ShopShipmentTrackingFetchResult =
  | { ok: true; data: ShopShipmentTrackingInfoJson }
  | { ok: false; errorMessage: string };

function getShopShipmentTrackerApiKey(): string {
  const fromEnv = process.env.SWEET_TRACKER_API_KEY?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : SWEET_TRACKER_FALLBACK_API_KEY;
}

function parseJsonSafe(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function isLookupSuccess(body: ShopShipmentTrackingInfoJson): boolean {
  if (body.status === false) return false;
  if (body.result === 'N') return false;
  if (body.result === 'Y') return true;
  if (body.status === true) return true;
  if (
    body.invoiceNo != null &&
    body.invoiceNo !== '' &&
    (body.level != null || (body.trackingDetails?.length ?? 0) > 0)
  ) {
    return true;
  }
  return false;
}

function isTrackingKindDelivered(kind: string | undefined): boolean {
  if (!kind) return false;
  return kind.includes('배송완료') || kind.includes('배달완료');
}

function isDeliveryComplete(body: ShopShipmentTrackingInfoJson): boolean {
  if (!isLookupSuccess(body)) return false;
  if (body.complete === true) return true;
  if (String(body.completeYN ?? '').trim().toUpperCase() === 'Y') return true;
  if (Number(body.level) === 6) return true;

  const details = body.trackingDetails ?? [];
  if (details.some((detail) => Number(detail.level) === 6 || isTrackingKindDelivered(detail.kind))) {
    return true;
  }

  const last =
    body.lastDetail ??
    (details.length > 0 ? details[details.length - 1] : undefined);
  if (Number(last?.level) === 6 || isTrackingKindDelivered(last?.kind)) return true;
  return false;
}

function deriveDeliveryStatus(body: ShopShipmentTrackingInfoJson): ShopShipmentDeliveryStatus {
  if (!isLookupSuccess(body)) return 'before_start';
  if (isDeliveryComplete(body)) return 'delivered';
  return 'in_transit';
}

function summarizeLastTracking(body: ShopShipmentTrackingInfoJson): {
  kind: string;
  timeString: string;
} {
  const last =
    body.lastDetail ??
    (body.trackingDetails?.length
      ? body.trackingDetails[body.trackingDetails.length - 1]
      : undefined);
  return {
    kind: last?.kind ?? '',
    timeString: last?.timeString ?? '',
  };
}

function parseTrackingDate(value: string): Date | null {
  if (!value.trim()) return null;
  const normalized = value.trim().replace(/\./g, '-').replace(/\s+/g, ' ');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function fetchShopShipmentTrackingInfo(
  trackingNumber: string
): Promise<ShopShipmentTrackingFetchResult> {
  const invoice = trackingNumber.replace(/\D/g, '').trim();
  if (!invoice) {
    return { ok: false, errorMessage: '송장번호가 비어 있습니다.' };
  }

  const url = new URL(SHOP_TRACKING_INFO_URL);
  url.searchParams.set('t_key', getShopShipmentTrackerApiKey());
  url.searchParams.set('t_code', SHOP_LOGISTICS_T_CODE_LOGEN);
  url.searchParams.set('t_invoice', invoice);

  let res: Response;
  try {
    res = await fetch(url.toString(), { method: 'GET' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, errorMessage: `네트워크 오류: ${msg}` };
  }

  const text = await res.text();
  const raw = parseJsonSafe(text);
  if (raw === null || typeof raw !== 'object') {
    return { ok: false, errorMessage: '배송 조회 응답 파싱에 실패했습니다.' };
  }

  const body = raw as ShopShipmentTrackingInfoJson;
  if (!res.ok) {
    return { ok: false, errorMessage: body.msg ?? `HTTP ${res.status}` };
  }
  if (body.status === false) {
    return { ok: false, errorMessage: body.msg ?? '배송 조회에 실패했습니다.' };
  }
  if (body.result === 'N') {
    return { ok: false, errorMessage: body.msg ?? '조회 결과가 없습니다.' };
  }

  return { ok: true, data: body };
}

export class ShopShipmentTrackingService {
  private repository = new ShopShipmentRepository();
  private lineRepository = new ShopOrderLineRepository();

  async lookupAndUpdate(shipmentId: string): Promise<{
    deliveryStatus: ShopShipmentDeliveryStatus;
    lastTrackingKind: string;
    lastTrackingAt: string | null;
    updatedLineIds: string[];
  }> {
    const shipment = await this.repository.findById(shipmentId);
    if (!shipment) {
      throw new Error('송장을 찾을 수 없습니다.');
    }

    const result = await fetchShopShipmentTrackingInfo(shipment.trackingNumber);
    if (!result.ok) {
      throw new Error(result.errorMessage);
    }

    const summary = summarizeLastTracking(result.data);
    const deliveryStatus = deriveDeliveryStatus(result.data);
    const lastTrackingAt = parseTrackingDate(summary.timeString);

    await this.repository.updateDeliveryStatus(
      shipmentId,
      deliveryStatus,
      summary.kind || null,
      lastTrackingAt
    );

    let updatedLineIds: string[] = [];
    if (deliveryStatus === 'delivered') {
      const lineIds = await this.repository.listBatchLineIds(shipment.batchId);
      if (lineIds.length > 0) {
        await this.lineRepository.setProductArrivedByIds(lineIds, true);
        updatedLineIds = lineIds;
      }
    }

    return {
      deliveryStatus,
      lastTrackingKind: summary.kind,
      lastTrackingAt: lastTrackingAt?.toISOString() ?? null,
      updatedLineIds,
    };
  }
}
