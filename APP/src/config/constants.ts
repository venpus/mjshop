/**
 * 애플리케이션 상수 설정
 */

// API 기본 URL (환경 변수에서 가져오거나 기본값 사용)
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
export const SERVER_BASE_URL = process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3000';

// 이미지 URL을 전체 URL로 변환하는 헬퍼 함수
export const getFullImageUrl = (imageUrl: string | null | undefined): string => {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  return `${SERVER_BASE_URL}${imageUrl}`;
};

