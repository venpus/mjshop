import type { BulkCompletedRow, BulkDeliveryCompletedResult } from './sweetTrackerService.js';
import { bulkFetchDeliveryCompleted, summarizeLastTracking } from './sweetTrackerService.js';
import type { SweetTrackerTrackingInfoJson } from './sweetTrackerService.js';
import {
  SweetTrackerInvoiceCacheRepository,
  type SweetTrackerInvoiceCacheRow,
} from '../repositories/sweetTrackerInvoiceCacheRepository.js';

function cacheRowToCompleted(r: SweetTrackerInvoiceCacheRow): BulkCompletedRow {
  return {
    invoiceNo: r.invoice_no,
    receiverName: r.receiver_name ?? '',
    itemName: r.item_name ?? '',
    senderName: r.sender_name ?? '',
    level: r.level_code,
    lastKind: r.last_kind ?? '',
    lastTimeString: r.last_time_string ?? '',
    lastWhere: r.last_where ?? '',
  };
}

function buildUpsertFromApiBody(
  tCode: string,
  invoice: string,
  data: SweetTrackerTrackingInfoJson,
  isComplete: boolean
) {
  const invNo = (data.invoiceNo ?? invoice).trim();
  const last = summarizeLastTracking(data);
  return {
    t_code: tCode,
    invoice_no: invNo,
    is_delivery_complete: isComplete,
    item_name: data.itemName ?? '',
    receiver_name: data.receiverName ?? '',
    sender_name: data.senderName ?? '',
    level_code: data.level ?? null,
    last_kind: last.kind,
    last_where: last.where,
    last_time_string: last.timeString,
  };
}

export interface BulkWithCacheMeta {
  from_cache: number;
  from_api: number;
}

/**
 * DB에 배송완료로 저장된 운송장은 API를 호출하지 않고 캐시 행으로 응답합니다.
 * 그 외(미저장 또는 미완료)는 API 조회 후 캐시를 갱신합니다.
 */
export async function bulkResolveTrackingWithCache(
  apiKey: string,
  tCode: string,
  invoices: string[],
  cacheRepo: SweetTrackerInvoiceCacheRepository,
  options?: { concurrency?: number; delayMs?: number }
): Promise<{ result: BulkDeliveryCompletedResult; meta: BulkWithCacheMeta }> {
  const cacheMap = await cacheRepo.findByTCodeAndInvoices(tCode, invoices);

  const fromCache: BulkCompletedRow[] = [];
  const needApi: string[] = [];

  for (const inv of invoices) {
    const row = cacheMap.get(inv);
    if (row && Number(row.is_delivery_complete) === 1) {
      fromCache.push(cacheRowToCompleted(row));
    } else {
      needApi.push(inv);
    }
  }

  if (needApi.length === 0) {
    fromCache.sort((a, b) => a.invoiceNo.localeCompare(b.invoiceNo, 'ko'));
    return {
      result: {
        completed: fromCache,
        notComplete: [],
        errors: [],
      },
      meta: { from_cache: fromCache.length, from_api: 0 },
    };
  }

  const apiResult = await bulkFetchDeliveryCompleted(apiKey, tCode, needApi, {
    ...options,
    onLookupSuccess: async (invoice, data, isDeliveryComplete) => {
      await cacheRepo.upsert(buildUpsertFromApiBody(tCode, invoice, data, isDeliveryComplete));
    },
  });

  const mergedCompleted = [...fromCache, ...apiResult.completed].sort((a, b) =>
    a.invoiceNo.localeCompare(b.invoiceNo, 'ko')
  );

  return {
    result: {
      completed: mergedCompleted,
      notComplete: apiResult.notComplete,
      errors: apiResult.errors,
    },
    meta: { from_cache: fromCache.length, from_api: needApi.length },
  };
}
