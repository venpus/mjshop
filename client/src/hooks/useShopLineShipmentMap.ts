import { useCallback, useEffect, useState } from 'react';
import { getShopShipmentBatches } from '../api/shopShipmentApi';
import {
  buildLineShipmentMap,
  type LineShipmentInfo,
} from '../utils/shopLineShipmentUtils';

export function useShopLineShipmentMap() {
  const [lineShipmentMap, setLineShipmentMap] = useState<Map<string, LineShipmentInfo>>(
    () => new Map()
  );
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const batches = await getShopShipmentBatches();
      setLineShipmentMap(buildLineShipmentMap(batches));
    } catch {
      setLineShipmentMap(new Map());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { lineShipmentMap, isLoading, reloadLineShipmentMap: reload };
}
