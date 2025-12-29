/**
 * 날짜를 한국어 형식으로 포맷팅합니다.
 */
export const formatDate = (date: string | Date): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

/**
 * 이미지 URL에서 확장자를 추출합니다.
 */
export const getImageExtension = (url: string): string => {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([a-z]+)(?:\?|$)/i);
    return match ? match[1] : 'jpg';
  } catch {
    return 'jpg';
  }
};

/**
 * 이미지를 다운로드합니다.
 */
export const handleDownload = async (imageUrl: string, filename: string): Promise<void> => {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('이미지 다운로드 실패:', error);
    alert('이미지 다운로드에 실패했습니다.');
  }
};

/**
 * 카테고리 옵션 목록
 */
export const CATEGORY_OPTIONS = ['펜던트', '패치', '목걸이', '열쇠고리', '택', '파우치', '박스'] as const;

