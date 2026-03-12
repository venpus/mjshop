/**
 * 제품 개발 협업 모듈에서 사용하는 이미지 URL.
 * 상대 경로(/uploads/...)는 서버 origin으로 보내기 위해 절대 URL로 변환합니다.
 * 모바일/같은 네트워크 접속 시 현재 호스트 기준으로 동작합니다.
 */
import { getApiBaseUrl, getServerOrigin } from '../../../api/baseUrl';

export function getProductCollabImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = getServerOrigin().replace(/\/$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
}

/** 스레드 첨부 파일 다운로드 URL (원본 파일명으로 다운로드되도록 API 경로 반환) */
export function getProductCollabDownloadUrl(
  productId: number,
  url: string,
  originalFilename?: string | null
): string {
  const API_BASE = getApiBaseUrl().replace(/\/$/, '');
  const pathParam = url.replace(/^\/uploads\//, '').replace(/^\/?/, '');
  const name = originalFilename || url.split('/').pop() || 'download';
  return `${API_BASE}/product-collab/products/${productId}/download?path=${encodeURIComponent(pathParam)}&name=${encodeURIComponent(name)}`;
}
