import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_DEBOUNCE_MS = 400;

/**
 * 검색 입력은 로컬 state로 즉시 반영(필터·입력창),
 * URL 저장은 debounce로 지연해 입력 끊김·중복 렌더를 방지합니다.
 */
export function useShopOrderListSearch(
  urlSearch: string,
  persistSearch: (value: string) => void,
  debounceMs = DEFAULT_DEBOUNCE_MS
) {
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingValueRef = useRef<string | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (isTypingRef.current) {
      return;
    }
    setSearchTerm(urlSearch);
  }, [urlSearch]);

  const flushPersist = useCallback(
    (value: string) => {
      pendingValueRef.current = null;
      isTypingRef.current = false;
      persistSearch(value);
    },
    [persistSearch]
  );

  const schedulePersist = useCallback(
    (value: string) => {
      pendingValueRef.current = value;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        flushPersist(value);
      }, debounceMs);
    },
    [debounceMs, flushPersist]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      isTypingRef.current = true;
      setSearchTerm(value);
      schedulePersist(value);
    },
    [schedulePersist]
  );

  const clearSearch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingValueRef.current = null;
    isTypingRef.current = false;
    setSearchTerm('');
    persistSearch('');
  }, [persistSearch]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (pendingValueRef.current !== null) {
        persistSearch(pendingValueRef.current);
      }
    };
  }, [persistSearch]);

  return {
    searchTerm,
    setSearchTerm: handleSearchChange,
    clearSearch,
  };
}
