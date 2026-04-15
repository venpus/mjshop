/**
 * 택배 조회·캐시에 저장할 패킹리스트 식별 토큰.
 * 동일 코드·다른 출고일 행이 겹치지 않도록 `코드::YYYY-MM-DD` 형식을 쓰고,
 * 출고일이 없으면 `코드::id:{패킹리스트id}` 로 구분합니다.
 */
export function packingListRowToken(pl: {
  id: number;
  code: string;
  shipment_date?: string | null;
}): string {
  const c = String(pl.code ?? '').trim();
  if (!c) return `id:${pl.id}`;
  const raw = pl.shipment_date != null ? String(pl.shipment_date).trim() : '';
  if (raw.length >= 10) return `${c}::${raw.slice(0, 10)}`;
  return `${c}::id:${pl.id}`;
}
