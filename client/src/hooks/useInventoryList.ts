import { useCallback, useEffect, useState } from 'react';
import { getStockInboundItems } from '../api/stockInboundApi';
import type { InventoryListItem } from '../components/inventory/types';
import { mapStockInboundToListItem } from '../utils/inventoryUtils';

export function useInventoryList() {
  const [items, setItems] = useState<InventoryListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const inboundItems = await getStockInboundItems();
      setItems(inboundItems.map(mapStockInboundToListItem));
    } catch (err) {
      console.error('재고 목록 로드 오류:', err);
      setError(err instanceof Error ? err.message : '재고 목록을 불러오지 못했습니다.');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    items,
    isLoading,
    error,
    reload: loadData,
  };
}
