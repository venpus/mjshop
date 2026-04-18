import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getThreadUnreadCount, markProductThreadViewed } from '../api/productCollabApi';

interface ProductCollabThreadUnreadContextValue {
  total: number;
  refresh: () => Promise<void>;
  markThreadViewed: (productId: number) => Promise<void>;
}

const ProductCollabThreadUnreadContext = createContext<ProductCollabThreadUnreadContextValue | null>(null);

const POLL_MS = 45_000;

export function ProductCollabThreadUnreadProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const [total, setTotal] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setTotal(0);
      return;
    }
    const res = await getThreadUnreadCount();
    if (res.success && res.data) setTotal(res.data.total);
  }, [enabled]);

  const markThreadViewed = useCallback(
    async (productId: number) => {
      if (!enabled) return;
      await markProductThreadViewed(productId);
    },
    [enabled]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(id);
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled) return;
    const onVis = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [enabled, refresh]);

  const value = useMemo(
    () => ({ total, refresh, markThreadViewed }),
    [total, refresh, markThreadViewed]
  );

  return (
    <ProductCollabThreadUnreadContext.Provider value={value}>
      {children}
    </ProductCollabThreadUnreadContext.Provider>
  );
}

export function useProductCollabThreadUnread() {
  return useContext(ProductCollabThreadUnreadContext);
}
