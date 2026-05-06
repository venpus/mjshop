import type { PaymentHistoryItem } from '../api/paymentHistoryApi';

/**
 * 결제내역(패킹리스트) 행에서 API에 넘길 packing_lists.id 문자열 목록을 구합니다.
 * 서버는 행당 하나의 ID를 내려주며, 과거 호환을 위해 source_id가 숫자 문자열이면 ID로 사용합니다.
 */
export function getPackingListIdStringsFromHistoryItem(item: PaymentHistoryItem): string[] {
  if (item.source_type !== 'packing_list') return [];
  const fromField =
    item.packing_list_ids
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  if (fromField.length > 0) return fromField;
  const sid = String(item.source_id ?? '').trim();
  if (/^\d+$/.test(sid)) return [sid];
  return [];
}
