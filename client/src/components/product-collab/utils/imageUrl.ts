/**
 * 제품 개발 협업 모듈에서 사용하는 이미지 URL.
 * 상대 경로(/uploads/...)는 서버 origin으로 보내기 위해 절대 URL로 변환합니다.
 */
const SERVER_ORIGIN = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export function getProductCollabImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = SERVER_ORIGIN.replace(/\/$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
}
