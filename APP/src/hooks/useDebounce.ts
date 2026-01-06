/**
 * Debounce 훅
 * 입력값이 변경된 후 일정 시간이 지나면 값을 반환
 */

import { useState, useEffect } from 'react';

/**
 * @param value debounce할 값
 * @param delay 지연 시간 (밀리초, 기본값: 500ms)
 * @returns debounce된 값
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // 타이머 설정
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // 클린업: 값이 변경되거나 컴포넌트가 언마운트되면 타이머 취소
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

