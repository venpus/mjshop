import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getShopOrders,
  SHOP_ORDER_STATUS_OPTIONS,
  type ShopOrder,
  type ShopOrderStatus,
} from '../api/shopOrderApi';
import { ShopOrderLineListTab } from './orders/ShopOrderLineListTab';
import {
  parseShopOrderListTab,
  SHOP_ORDER_LIST_TAB_PARAM,
  shopOrderListSearchParams,
} from './orders/shopOrderListNavigation';
import { ShopOrderListTabs, type ShopOrderListTab } from './orders/ShopOrderListTabs';
import { ShopOrderProductListTab } from './orders/ShopOrderProductListTab';

export function Orders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseShopOrderListTab(searchParams.get(SHOP_ORDER_LIST_TAB_PARAM));
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getShopOrders();
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '주문 목록을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    () => orders.reduce((sum, order) => sum + (order.lines.length || order.lineCount), 0),
    [orders]
  );

  const handleTabChange = (tab: ShopOrderListTab) => {
    const nextParams = shopOrderListSearchParams(tab);
    setSearchParams(nextParams ?? {}, { replace: true });
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
      />

      {isLoading ? (
        <div className="py-16 text-center text-gray-500">주문 목록을 불러오는 중...</div>
      ) : error ? (
        <div className="py-16 text-center text-red-600">{error}</div>
      ) : activeTab === 'products' ? (
        <ShopOrderProductListTab orders={orders} listTab={activeTab} onReload={loadOrders} />
      ) : (
        <ShopOrderLineListTab orders={orders} listTab={activeTab} onReload={loadOrders} />
      )}
    </div>
  );
}
