import { useState, useCallback, useMemo } from 'react';
import type { PackingListItem } from '../components/packing-list/types';

/**
 * 코드와 날짜를 조합하여 고유 키 생성
 */
function getCodeDateKey(code: string, date: string): string {
  return `${code}-${date}`;
}

/**
 * 패킹리스트 선택 상태를 관리하는 훅
 * 코드와 날짜를 조합하여 고유 식별자로 사용
 */
export function usePackingListSelection(items: PackingListItem[]) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // 첫 번째 행 아이템들만 추출 (그룹당 하나만)
  const firstRowItems = useMemo(() => {
    return items.filter(item => item.isFirstRow);
  }, [items]);

  // 단일 코드-날짜 조합 선택/해제
  const toggleCode = useCallback((code: string, date: string) => {
    const key = getCodeDateKey(code, date);
    setSelectedKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }, []);

  // 모든 코드-날짜 조합 선택/해제
  const toggleAllCodes = useCallback((checked: boolean) => {
    if (checked) {
      const allKeys = new Set(firstRowItems.map(item => getCodeDateKey(item.code, item.date)));
      setSelectedKeys(allKeys);
    } else {
      setSelectedKeys(new Set());
    }
  }, [firstRowItems]);

  // 모든 코드-날짜 조합이 선택되었는지 확인
  const isAllSelected = firstRowItems.length > 0 && selectedKeys.size === firstRowItems.length;

  // 특정 코드-날짜 조합이 선택되었는지 확인
  const isCodeSelected = useCallback((code: string, date: string) => {
    const key = getCodeDateKey(code, date);
    return selectedKeys.has(key);
  }, [selectedKeys]);

  // 선택 초기화
  const clearSelection = useCallback(() => {
    setSelectedKeys(new Set());
  }, []);

  // 선택된 키들을 코드-날짜 조합 배열로 반환 (하위 호환성)
  const selectedCodes = useMemo(() => {
    return new Set(Array.from(selectedKeys).map(key => key.split('-')[0]));
  }, [selectedKeys]);

  return {
    selectedCodes, // 하위 호환성을 위해 유지 (하지만 실제로는 selectedKeys 사용)
    selectedKeys, // 새로운 속성: 코드-날짜 조합 Set
    toggleCode,
    toggleAllCodes,
    isAllSelected,
    isCodeSelected,
    clearSelection,
  };
}
