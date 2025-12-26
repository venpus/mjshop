/**
 * 날짜를 YYYY-MM-DD 형식의 문자열로 변환합니다.
 * Date 객체, 문자열, 또는 null을 안전하게 처리합니다.
 * 타임존 문제를 방지하기 위해 로컬 날짜만 사용합니다.
 */
export function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  // 이미 문자열인 경우 그대로 반환 (YYYY-MM-DD 형식)
  if (typeof date === 'string') {
    // 문자열이 YYYY-MM-DD 형식인지 확인
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    // 다른 형식의 문자열인 경우 Date 객체로 변환 후 처리
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    // 로컬 날짜로 변환 (타임존 문제 방지)
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Date 객체인 경우 로컬 날짜로 변환 (타임존 문제 방지)
  if (date instanceof Date) {
    if (isNaN(date.getTime())) {
      return '';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return '';
}

