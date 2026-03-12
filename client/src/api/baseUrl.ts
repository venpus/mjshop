/**
 * API 베이스 URL (모바일/같은 네트워크 접속 대응)
 * - VITE_API_URL이 있으면 사용
 * - 없고 브라우저가 localhost가 아니면 현재 호스트 + 포트 3000 사용 (모바일에서 PC IP로 접속 시)
 * - 그 외에는 localhost:3000
 */
export function getApiBaseUrl(): string {
  if (import.meta.env.VITE_API_URL) {
    return (import.meta.env.VITE_API_URL as string).replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:3000/api`;
    }
  }
  return 'http://localhost:3000/api';
}

/**
 * 서버 오리진 (이미지/파일 URL용, /api 제거)
 */
export function getServerOrigin(): string {
  const apiUrl = getApiBaseUrl();
  return apiUrl.replace(/\/api\/?$/, '') || 'http://localhost:3000';
}
