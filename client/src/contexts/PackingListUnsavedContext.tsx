import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface PackingListUnsavedContextType {
  /** 패킹리스트에 저장하지 않은 변경이 있는지 */
  hasUnsavedChanges: boolean;
  /** 패킹리스트 페이지에서만 호출. true면 이동 시 확인 표시 대상 */
  setHasUnsavedChanges: (value: boolean) => void;
}

const PackingListUnsavedContext = createContext<PackingListUnsavedContextType | undefined>(undefined);

export function PackingListUnsavedProvider({ children }: { children: ReactNode }) {
  const [hasUnsavedChanges, setHasUnsavedChangesState] = useState(false);
  const setHasUnsavedChanges = useCallback((value: boolean) => {
    setHasUnsavedChangesState(value);
  }, []);

  return (
    <PackingListUnsavedContext.Provider value={{ hasUnsavedChanges, setHasUnsavedChanges }}>
      {children}
    </PackingListUnsavedContext.Provider>
  );
}

export function usePackingListUnsaved() {
  const ctx = useContext(PackingListUnsavedContext);
  if (ctx === undefined) {
    throw new Error('usePackingListUnsaved must be used within PackingListUnsavedProvider');
  }
  return ctx;
}
