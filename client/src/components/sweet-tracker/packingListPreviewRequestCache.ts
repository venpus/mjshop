import {
  getSweetTrackerPackingListPreview,
  type SweetTrackerPackingListPreviewData,
} from '../../api/sweetTrackerApi';

const okCache = new Map<string, SweetTrackerPackingListPreviewData>();
const inflight = new Map<string, Promise<SweetTrackerPackingListPreviewData>>();

/**
 * 동일 토큰에 대한 패킹 프리뷰 요청을 합치고, 성공 응답만 짧게 재사용합니다.
 */
export function loadSweetTrackerPackingListPreviewCached(
  userId: string,
  token: string
): Promise<SweetTrackerPackingListPreviewData> {
  const hit = okCache.get(token);
  if (hit) return Promise.resolve(hit);

  let p = inflight.get(token);
  if (!p) {
    p = getSweetTrackerPackingListPreview(userId, token)
      .then((json) => {
        inflight.delete(token);
        okCache.set(token, json.data);
        return json.data;
      })
      .catch((e) => {
        inflight.delete(token);
        throw e;
      });
    inflight.set(token, p);
  }
  return p;
}
