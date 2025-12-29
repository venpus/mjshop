import { useState, useCallback } from 'react';
import type { PackingListItem } from '../components/packing-list/types';

/**
 * 패킹리스트 선택 상태를 관리하는 훅
 */
export function usePackingListSelection(items: PackingListItem[]) {
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());

  // 단일 코드 선택/해제
  const toggleCode = useCallback((code: string) => {
    setSelectedCodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(code)) {
        newSet.delete(code);
      } else {
        newSet.add(code);
      }
      return newSet;
    });
  }, []);

  // 모든 코드 선택/해제
  const toggleAllCodes = useCallback((checked: boolean) => {
    if (checked) {
      const allCodes = new Set(items.map(item => item.code));
      setSelectedCodes(allCodes);
    } else {
      setSelectedCodes(new Set());
    }
  }, [items]);

  // 모든 코드가 선택되었는지 확인
  const isAllSelected = items.length > 0 && selectedCodes.size === new Set(items.map(item => item.code)).size;

  // 특정 코드가 선택되었는지 확인
  const isCodeSelected = useCallback((code: string) => {
    return selectedCodes.has(code);
  }, [selectedCodes]);

  // 선택 초기화
  const clearSelection = useCallback(() => {
    setSelectedCodes(new Set());
  }, []);

  return {
    selectedCodes,
    toggleCode,
    toggleAllCodes,
    isAllSelected,
    isCodeSelected,
    clearSelection,
  };
}
