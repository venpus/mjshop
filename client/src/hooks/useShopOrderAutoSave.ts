import { useEffect, useRef } from 'react';

const AUTO_SAVE_DELAY_MS = 800;

interface UseShopOrderAutoSaveOptions {
  isDirty: boolean;
  isLoading: boolean;
  isSaving: boolean;
  onSave: () => Promise<void>;
}

/**
 * 주문 상세 폼 변경 시 debounce 후 자동 저장
 */
export function useShopOrderAutoSave({
  isDirty,
  isLoading,
  isSaving,
  onSave,
}: UseShopOrderAutoSaveOptions) {
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (isLoading || !isDirty || isSaving) return;

    const timer = window.setTimeout(() => {
      void onSaveRef.current();
    }, AUTO_SAVE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [isDirty, isLoading, isSaving]);
}
