import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getShopOrders,
  SHOP_ORDER_STATUS_OPTIONS,
  type ShopOrder,
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

export function Orders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseShopOrderListTab(searchParams.get(SHOP_ORDER_LIST_TAB_PARAM));
  const { lineShipmentMap, reloadLineShipmentMap } = useShopLineShipmentMap();
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const loadOrders = useCallback(async () => {
    if (!hasLoadedOnceRef.current) {
      setIsInitialLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);
    try {
      const data = await getShopOrders();
      setOrders(data);
      hasLoadedOnceRef.current = true;
      await reloadLineShipmentMap();
    } catch (err) {
      setError(err instanceof Error ? err.message : '주문 목록을 불러오지 못했습니다.');
    } finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
    }
  }, [reloadLineShipmentMap]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const statusCounts = useMemo(() => {
    const counts: Record<ShopOrderStatus, number> = {
      판매대기: 0,
      판매중: 0,
      품절: 0,
      판매완료: 0,
    };
    orders.forEach((order) => {
      counts[order.status] += 1;
    });
    return counts;
  }, [orders]);

  const lineCount = useMemo(
    () =>
      orders.reduce(
        (sum, order) => sum + order.lines.filter((line) => !line.isReservation).length,
        0
      ),
    [orders]
  );

  const reservationCount = useMemo(
    () =>
      orders.reduce(
        (sum, order) => sum + order.lines.filter((line) => line.isReservation).length,
        0
      ),
    [orders]
  );

  const patchOrder = useCallback((updated: ShopOrder) => {
    setOrders((prev) => prev.map((order) => (order.id === updated.id ? updated : order)));
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

  return (
    <div className="p-8 min-h-[1080px]">
      <div className="mb-8">
        <h2 className="text-gray-900 mb-2">주문 관리</h2>
        <p className="text-gray-600">재고에서 등록한 제품의 판매 주문을 관리할 수 있습니다</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {SHOP_ORDER_STATUS_OPTIONS.map((status) => (
          <div key={status} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <p className="text-gray-600 mb-1">{status}</p>
            <p className="text-gray-900">{statusCounts[status]}건</p>
          </div>
        ))}
      </div>

      <ShopOrderListTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        productCount={orders.length}
        lineCount={lineCount}
        reservationCount={reservationCount}
      />

      {isInitialLoading ? (
        <div className="py-16 text-center text-gray-500">주문 목록을 불러오는 중...</div>
      ) : error && orders.length === 0 ? (
        <div className="py-16 text-center text-red-600">{error}</div>
      ) : (
        <>
          {isRefreshing && (
            <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
              <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-purple-600 rounded-full animate-spin" />
              목록을 새로고치는 중...
            </div>
          )}
          {error && orders.length > 0 && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {activeTab === 'products' ? (
            <ShopOrderProductListTab orders={orders} listTab={activeTab} onReload={loadOrders} />
          ) : (
            <ShopOrderLineListTab
              orders={orders}
              listTab={activeTab}
              lineKind={activeTab === 'reservations' ? 'reservations' : 'orders'}
              lineShipmentMap={lineShipmentMap}
              onReload={loadOrders}
              onOrderPatched={patchOrder}
            />
          )}
        </>
      )}
    </div>
  );
}
