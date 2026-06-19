import { useCallback, useEffect } from 'react';
import { useDeferredSearch } from './useDeferredSearch';

/** URL에 저장된 적용 검색어와 입력창을 분리하고, 제출·초기화 시 onApply 호출 */
export function useShopOrderListDeferredSearch(
  appliedSearch: string,
  onApply: (value: string) => void
) {
  const search = useDeferredSearch(appliedSearch);

  useEffect(() => {
    if (appliedSearch !== search.applied) {
      search.setApplied(appliedSearch);
      search.setInput(appliedSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedSearch]);

  const submit = useCallback(() => {
    const trimmed = search.input.trim();
    search.setInput(trimmed);
    search.setApplied(trimmed);
    onApply(trimmed);
  }, [onApply, search.input, search.setApplied, search.setInput]);

  const clear = useCallback(() => {
    search.setInput('');
    search.setApplied('');
    onApply('');
  }, [onApply, search.setApplied, search.setInput]);

  return {
    searchInput: search.input,
    setSearchInput: search.setInput,
    submitSearch: submit,
    clearSearch: clear,
  };
}
