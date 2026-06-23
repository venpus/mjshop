import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getShopOrderListStats,
  getShopOrders,
  SHOP_ORDER_STATUS_OPTIONS,
  type ShopOrder,
  type ShopOrderListStats,
  type ShopOrderStatus,
} from '../api/shopOrderApi';
import { ShopOrderLineListTab } from './orders/ShopOrderLineListTab';
import { useShopLineShipmentMap } from '../hooks/useShopLineShipmentMap';
import {
  parseShopOrderListTab,
  SHOP_ORDER_LIST_TAB_PARAM,
} from './orders/shopOrderListUrlParams';
import { ShopOrderListTabs, type ShopOrderListTab } from './orders/ShopOrderListTabs';
import { ShopOrderProductListTab } from './orders/ShopOrderProductListTab';

const EMPTY_STATUS_COUNTS: Record<ShopOrderStatus, number> = {
  판매대기: 0,
  판매중: 0,
  품절: 0,
  판매완료: 0,
};

export function Orders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseShopOrderListTab(searchParams.get(SHOP_ORDER_LIST_TAB_PARAM));
  const { lineShipmentMap, reloadLineShipmentMap } = useShopLineShipmentMap({ autoLoad: false });
  const [listStats, setListStats] = useState<ShopOrderListStats>({
    statusCounts: { ...EMPTY_STATUS_COUNTS },
    productCount: 0,
    lineCount: 0,
    reservationCount: 0,
  });
  const [lineTabOrders, setLineTabOrders] = useState<ShopOrder[]>([]);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isLineTabLoading, setIsLineTabLoading] = useState(false);
  const [lineTabError, setLineTabError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const lineTabLoadedRef = useRef(false);

  const loadListStats = useCallback(async () => {
    setStatsError(null);
    try {
      const stats = await getShopOrderListStats();
      setListStats(stats);
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : '주문 통계를 불러오지 못했습니다.');
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  const loadLineTabOrders = useCallback(async () => {
    setIsLineTabLoading(true);
    setLineTabError(null);
    try {
      const [data] = await Promise.all([getShopOrders(), reloadLineShipmentMap()]);
      setLineTabOrders(data);
      lineTabLoadedRef.current = true;
    } catch (err) {
      setLineTabError(err instanceof Error ? err.message : '주문 목록을 불러오지 못했습니다.');
    } finally {
      setIsLineTabLoading(false);
    }
  }, [reloadLineShipmentMap]);

  useEffect(() => {
    void loadListStats();
  }, [loadListStats]);

  useEffect(() => {
    if ((activeTab === 'lines' || activeTab === 'reservations') && !lineTabLoadedRef.current) {
      void loadLineTabOrders();
    }
  }, [activeTab, loadLineTabOrders]);

  const handleLineTabReload = useCallback(async () => {
    await Promise.all([loadListStats(), loadLineTabOrders()]);
  }, [loadListStats, loadLineTabOrders]);

  const patchOrder = useCallback((updated: ShopOrder) => {
    setLineTabOrders((prev) => prev.map((order) => (order.id === updated.id ? updated : order)));
  }, []);

  const handleTabChange = (tab: ShopOrderListTab) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (tab === 'products') {
          next.delete(SHOP_ORDER_LIST_TAB_PARAM);
        } else {
          next.set(SHOP_ORDER_LIST_TAB_PARAM, tab);
        }
        return next;
      },
      { replace: true }
    );
  };

  const statusCounts = listStats.statusCounts;

  return (
    <div className="p-8 min-h-[1080px]">
      <div className="mb-8">
        <h2 className="text-gray-900 mb-2">주문 관리</h2>
        <p className="text-gray-600">재고에서 등록한 제품의 판매 주문을 관리할 수 있습니다</p>
      </div>

      {statsError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {statsError}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {SHOP_ORDER_STATUS_OPTIONS.map((status) => (
          <div key={status} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <p className="text-gray-600 mb-1">{status}</p>
            <p className="text-gray-900">
              {isStatsLoading ? '-' : `${statusCounts[status]}건`}
            </p>
          </div>
        ))}
      </div>

      <ShopOrderListTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        productCount={listStats.productCount}
        lineCount={listStats.lineCount}
        reservationCount={listStats.reservationCount}
      />

      {activeTab === 'products' ? (
        <ShopOrderProductListTab
          listTab={activeTab}
          onStatsReload={loadListStats}
        />
      ) : isLineTabLoading && !lineTabLoadedRef.current ? (
        <div className="py-16 text-center text-gray-500">주문 목록을 불러오는 중...</div>
      ) : lineTabError && lineTabOrders.length === 0 ? (
        <div className="py-16 text-center text-red-600">{lineTabError}</div>
      ) : (
        <>
          {isLineTabLoading && (
            <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
              <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-purple-600 rounded-full animate-spin" />
              목록을 새로고치는 중...
            </div>
          )}
          {lineTabError && lineTabOrders.length > 0 && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {lineTabError}
            </div>
          )}
          <ShopOrderLineListTab
            orders={lineTabOrders}
            listTab={activeTab}
            lineKind={activeTab === 'reservations' ? 'reservations' : 'orders'}
            lineShipmentMap={lineShipmentMap}
            onReload={handleLineTabReload}
            onOrderPatched={patchOrder}
          />
        </>
      )}
    </div>
  );
}
