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

/**
 * 날짜 문자열을 YYYY-MM-DD 형식으로 정규화합니다.
 * ISO 형식(2024-01-04T00:00:00.000Z)이나 DATETIME 형식을 처리합니다.
 * 타임존 변환 없이 날짜 부분만 추출하여 하루 차이 문제를 방지합니다.
 * 
 * @param date - 정규화할 날짜 문자열 (ISO, DATETIME, 또는 YYYY-MM-DD)
 * @returns YYYY-MM-DD 형식의 날짜 문자열, 또는 빈 문자열
 */
export function normalizeDateValue(date: string | null | undefined): string {
  if (!date) return '';
  
  // 이미 YYYY-MM-DD 형식이면 그대로 반환
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  // ISO 형식 (2024-01-04T00:00:00.000Z) 또는 DATETIME 형식 처리
  // 타임존 변환 없이 날짜 부분만 추출
  if (date.includes('T')) {
    // ISO 형식: 날짜 부분만 추출 (T 이전 부분)
    const datePart = date.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      return datePart;
    }
  }
  
  // DATETIME 형식 (2024-01-04 00:00:00) 처리
  if (date.includes(' ')) {
    const datePart = date.split(' ')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      return datePart;
    }
  }
  
  // 다른 형식인 경우 빈 문자열 반환
  return '';
}

