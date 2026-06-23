import { useCallback, useEffect, useState } from 'react';
import { getShopShipmentBatches } from '../api/shopShipmentApi';
import {
  buildLineShipmentMap,
  type LineShipmentInfo,
} from '../utils/shopLineShipmentUtils';

export function useShopLineShipmentMap(options?: { autoLoad?: boolean }) {
  const autoLoad = options?.autoLoad !== false;
  const [lineShipmentMap, setLineShipmentMap] = useState<Map<string, LineShipmentInfo>>(
    () => new Map()
  );
  const [isLoading, setIsLoading] = useState(autoLoad);

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
    if (autoLoad) {
      void reload();
    }
  }, [autoLoad, reload]);

  return { lineShipmentMap, isLoading, reloadLineShipmentMap: reload };
}
