/**
 * 현재 날짜를 서버의 로컬 날짜 기준으로 YYYY-MM-DD 형식으로 반환합니다.
 * 타임존 변환 없이 로컬 날짜를 그대로 사용합니다.
 * @returns YYYY-MM-DD 형식의 날짜 문자열
 */
export function getKSTDateString(): string {
  const now = new Date();
  // 로컬 날짜를 그대로 사용 (타임존 변환 없이)
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Date 객체 또는 날짜 문자열을 YYYY-MM-DD 형식으로 변환합니다.
 * MySQL의 DATE 타입은 이미 YYYY-MM-DD 형식의 문자열이므로, 그대로 반환합니다.
 * 타임존 변환 없이 날짜를 그대로 사용합니다.
 * @param date Date 객체 또는 YYYY-MM-DD 형식의 문자열
 * @returns YYYY-MM-DD 형식의 날짜 문자열 또는 null
 */
export function formatDateToKSTString(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  
  // 이미 YYYY-MM-DD 형식의 문자열인 경우 그대로 반환 (MySQL DATE 타입)
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  // Date 객체인 경우 로컬 날짜로 변환 (타임존 변환 없이)
  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) {
    return null;
  }
  
  // 로컬 날짜를 그대로 사용 (타임존 변환 없이)
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

