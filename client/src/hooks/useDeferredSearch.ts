import { useCallback, useState } from 'react';

/** 입력값과 API에 사용하는 검색어를 분리 (엔터/검색 버튼으로만 applied 반영) */
export function useDeferredSearch(initialApplied = '') {
  const [input, setInput] = useState(initialApplied);
  const [applied, setApplied] = useState(initialApplied);

  const commit = useCallback(() => {
    const trimmed = input.trim();
    setInput(trimmed);
    setApplied(trimmed);
  }, [input]);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
    if (value === '') {
      setApplied('');
    }
  }, []);

  const reset = useCallback(() => {
    setInput('');
    setApplied('');
  }, []);

  return { input, applied, commit, handleInputChange, reset, setInput, setApplied };
}
