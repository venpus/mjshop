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
 * 날짜를 한국표준시(KST) 기준으로 한국 형식으로 포맷합니다.
 * 서버에서 YYYY-MM-DD 형식으로 보낸 날짜를 그대로 한국 시간대로 해석하여 표시합니다.
 * @param date Date 객체, 문자열(YYYY-MM-DD), 또는 null
 * @returns 한국 형식 날짜 문자열 (예: 2024년 1월 15일)
 */
export function formatDateKST(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  let year: number, month: number, day: number;
  
  if (typeof date === 'string') {
    // YYYY-MM-DD 형식의 문자열인 경우 - 타임존 변환 없이 직접 파싱
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      [year, month, day] = date.split('-').map(Number);
      // 날짜를 그대로 사용하여 한국 형식으로 포맷
      return `${year}년 ${month}월 ${day}일`;
    } else {
      // 다른 형식의 문자열인 경우 Date 객체로 변환 후 한국 시간대로 변환
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return '';
      }
      // 한국 시간대(UTC+9)로 변환하여 날짜 추출
      const kstOffset = 9 * 60 * 60 * 1000; // 9시간을 밀리초로 변환
      const kstTime = new Date(dateObj.getTime() + (dateObj.getTimezoneOffset() * 60 * 1000) + kstOffset);
      year = kstTime.getUTCFullYear();
      month = kstTime.getUTCMonth() + 1;
      day = kstTime.getUTCDate();
      return `${year}년 ${month}월 ${day}일`;
    }
  } else if (date instanceof Date) {
    if (isNaN(date.getTime())) {
      return '';
    }
    // 한국 시간대(UTC+9)로 변환하여 날짜 추출
    const kstOffset = 9 * 60 * 60 * 1000; // 9시간을 밀리초로 변환
    const kstTime = new Date(date.getTime() + (date.getTimezoneOffset() * 60 * 1000) + kstOffset);
    year = kstTime.getUTCFullYear();
    month = kstTime.getUTCMonth() + 1;
    day = kstTime.getUTCDate();
    return `${year}년 ${month}월 ${day}일`;
  } else {
    return '';
  }
}

/**
 * 현재 날짜를 브라우저의 로컬 날짜 기준으로 YYYY-MM-DD 형식으로 반환합니다.
 * 타임존 변환 없이 로컬 날짜를 그대로 사용합니다.
 * @returns YYYY-MM-DD 형식의 날짜 문자열
 */
export function getLocalDateString(): string {
  const now = new Date();
  // 로컬 날짜를 그대로 사용 (타임존 변환 없이)
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * @deprecated getLocalDateString()을 사용하세요
 * 현재 날짜를 한국 시간대(UTC+9) 기준으로 YYYY-MM-DD 형식으로 반환합니다.
 * @returns YYYY-MM-DD 형식의 날짜 문자열
 */
export function getKSTDateString(): string {
  return getLocalDateString();
}

