import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { getShopOrders, type ShopOrder } from '../../api/shopOrderApi';
import { useShopOrderListPagination } from '../../hooks/useShopOrderListPagination';
import { buildShopOrderLineListRows } from '../../utils/shopOrderListExport';
import {
  calculateLogisticsFee,
  formatKrwAmount,
} from '../../utils/shopSalesSettlement';
import {
  formatLineOrderRef,
  formatLineQuantity,
} from '../../utils/shopOrderLineListUtils';
import { ShopOrderListPagination } from '../orders/ShopOrderListPagination';

function formatOptionalText(value: string | null | undefined): string {
  return value?.trim() ? value.trim() : '-';
}

export function ShopShippingManagementPage() {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  const lineRows = useMemo(() => buildShopOrderLineListRows(orders), [orders]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return lineRows;

    return lineRows.filter((row) => {
      const haystack = [
        row.orderNumber,
        row.productName,
        row.line.companyName ?? '',
        row.line.recipientName ?? '',
        row.line.phoneNumber ?? '',
        row.line.address ?? '',
        row.line.trackingNumber ?? '',
        row.line.lineOrderNumber ?? '',
        formatLineOrderRef(row.line.lineOrderNumber, row.orderNumber, row.lineIndex),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [lineRows, searchTerm]);

  const {
    paginatedItems,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
  } = useShopOrderListPagination(filteredRows, searchTerm);

  return (
    <div className="p-8 min-h-[1080px]">
      <div className="mb-8">
        <h2 className="text-gray-900 mb-2">배송 관리</h2>
        <p className="text-gray-600">
          주문 건별로 택배 발송에 필요한 박스 수, 택배비, 박스비, 송장번호를 확인·관리합니다.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <label htmlFor="shipping-search" className="block text-sm font-medium text-gray-700 mb-1">
          검색
        </label>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            id="shipping-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="주문번호, 상호, 수령인, 송장번호, 주소"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          주문 데이터를 불러오는 중...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <ShopOrderListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={setCurrentPage}
            className="px-4 py-3 border-b border-gray-200"
          />

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 text-left font-medium text-gray-600 whitespace-nowrap">
                    주문
                  </th>
                  <th className="px-3 py-3 text-left font-medium text-gray-600 whitespace-nowrap">
                    등록일
                  </th>
                  <th className="px-3 py-3 text-left font-medium text-gray-600 whitespace-nowrap">
                    상호
                  </th>
                  <th className="px-3 py-3 text-left font-medium text-gray-600 whitespace-nowrap">
                    상품
                  </th>
                  <th className="px-3 py-3 text-left font-medium text-gray-600 whitespace-nowrap">
                    수령인
                  </th>
                  <th className="px-3 py-3 text-left font-medium text-gray-600 whitespace-nowrap">
                    전화
                  </th>
                  <th className="px-3 py-3 text-left font-medium text-gray-600 whitespace-nowrap">
                    주소
                  </th>
                  <th className="px-3 py-3 text-right font-medium text-gray-600 whitespace-nowrap">
                    수량
                  </th>
                  <th className="px-3 py-3 text-right font-medium text-gray-600 whitespace-nowrap">
                    택배 박스
                  </th>
                  <th className="px-3 py-3 text-right font-medium text-gray-600 whitespace-nowrap">
                    택배비
                  </th>
                  <th className="px-3 py-3 text-right font-medium text-gray-600 whitespace-nowrap">
                    박스비
                    <span className="block text-[10px] font-normal text-gray-400">박스×1,200</span>
                  </th>
                  <th className="px-3 py-3 text-left font-medium text-gray-600 whitespace-nowrap">
                    송장번호
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-3 py-12 text-center text-gray-500">
                      표시할 주문 건이 없습니다.
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((row) => {
                    const boxFee = calculateLogisticsFee(row.line.orderBoxCount);

                    return (
                      <tr key={row.rowKey} className="hover:bg-gray-50">
                        <td className="px-3 py-3 whitespace-nowrap font-medium text-gray-900 select-text cursor-text">
                          {formatLineOrderRef(
                            row.line.lineOrderNumber,
                            row.orderNumber,
                            row.lineIndex
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-gray-700">
                          {row.orderDate ?? '-'}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-gray-700 max-w-[120px] truncate">
                          {formatOptionalText(row.line.companyName)}
                        </td>
                        <td
                          className="px-3 py-3 text-gray-700 max-w-[140px] truncate"
                          title={row.productName}
                        >
                          {row.productName}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-gray-700 max-w-[88px] truncate">
                          {formatOptionalText(row.line.recipientName)}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-gray-700">
                          {formatOptionalText(row.line.phoneNumber)}
                        </td>
                        <td
                          className="px-3 py-3 text-gray-700 max-w-[180px] truncate"
                          title={row.line.address ?? undefined}
                        >
                          {formatOptionalText(row.line.address)}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-gray-700">
                          {formatLineQuantity(row.line)}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-gray-900">
                          {row.line.orderBoxCount.toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-gray-700">
                          {formatKrwAmount(row.line.deliveryFee)}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-gray-700">
                          {formatKrwAmount(boxFee)}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-gray-900 font-mono text-xs">
                          {formatOptionalText(row.line.trackingNumber)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <ShopOrderListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={setCurrentPage}
            className="px-4 py-3 border-t border-gray-200"
          />
        </div>
      )}
    </div>
  );
}
