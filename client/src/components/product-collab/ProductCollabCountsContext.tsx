import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getProductCounts } from '../../api/productCollabApi';
import type { ProductCollabCounts } from '../../api/productCollabApi';

interface ProductCollabCountsContextValue {
  counts: ProductCollabCounts | null;
  refresh: () => Promise<void>;
}

const ProductCollabCountsContext = createContext<ProductCollabCountsContextValue | null>(null);

export function ProductCollabCountsProvider({ children }: { children: React.ReactNode }) {
  const [counts, setCounts] = useState<ProductCollabCounts | null>(null);

  const refresh = useCallback(async () => {
    const res = await getProductCounts();
    if (res.success && res.data) setCounts(res.data);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <ProductCollabCountsContext.Provider value={{ counts, refresh }}>
      {children}
    </ProductCollabCountsContext.Provider>
  );
}

export function useProductCollabCounts() {
  const ctx = useContext(ProductCollabCountsContext);
  return ctx;
}
