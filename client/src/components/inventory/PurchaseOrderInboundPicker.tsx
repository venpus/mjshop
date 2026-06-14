import { useCallback, useEffect, useState } from 'react';
import { Image } from 'lucide-react';
import {
  getAvailablePurchaseOrdersForInbound,
  type AvailablePurchaseOrderForInbound,
} from '../../api/stockInboundApi';
import { getFullImageUrl } from '../../api/purchaseOrderApi';
import { SearchBar } from '../ui/search-bar';
import { TablePagination } from '../ui/table-pagination';
import {
  resolveDefaultInboundQuantity,
  resolveDisplayUnitPrice,
} from '../../utils/inventoryUtils';

interface PurchaseOrderInboundPickerProps {
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}

export function PurchaseOrderInboundPicker({
  selectedIds,
  onSelectionChange,
}: PurchaseOrderInboundPickerProps) {
  const [orders, setOrders] = useState<AvailablePurchaseOrderForInbound[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [inputSearchTerm, setInputSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAvailablePurchaseOrdersForInbound(
        searchTerm.trim() || undefined,
        currentPage,
        itemsPerPage
      );
      setOrders(result.data);
      setTotalItems(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '발주 목록을 불러오지 못했습니다.');
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, currentPage, itemsPerPage]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleSearch = () => {
    setSearchTerm(inputSearchTerm.trim());
    setCurrentPage(1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const toggleAllOnPage = () => {
    const pageIds = orders.map((o) => o.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
    const next = new Set(selectedIds);
    if (allSelected) {
      pageIds.forEach((id) => next.delete(id));
    } else {
      pageIds.forEach((id) => next.add(id));
    }
    onSelectionChange(next);
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + orders.length, totalItems);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <SearchBar
          value={inputSearchTerm}
          onChange={setInputSearchTerm}
          onKeyDown={handleSearchKeyDown}
          placeholder="발주번호, 상품명으로 검색..."
        />
        <button
          type="button"
          onClick={handleSearch}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium whitespace-nowrap text-sm"
        >
          검색
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={totalItems}
          startIndex={startIndex}
          endIndex={endIndex}
          itemsPerPageOptions={[10, 15, 20]}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(value) => {
            setItemsPerPage(value);
            setCurrentPage(1);
          }}
          className="border-t-0 border-b border-gray-200"
        />

        <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
          {isLoading ? (
            <div className="py-12 text-center text-gray-500 text-sm">발주 목록을 불러오는 중...</div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm">
              입고에 추가할 수 있는 발주가 없습니다.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-center w-10">
                    <input
                      type="checkbox"
                      checked={orders.length > 0 && orders.every((o) => selectedIds.has(o.id))}
                      onChange={toggleAllOnPage}
                      className="w-4 h-4 cursor-pointer accent-purple-600"
                    />
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">제품</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">발주번호</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">단가</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">입고예정수량</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">판매가</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => {
                  const unitPrice = resolveDisplayUnitPrice(order);
                  const inboundQty = resolveDefaultInboundQuantity(order);
                  const imageUrl = getFullImageUrl(order.productMainImage);

                  return (
                    <tr
                      key={order.id}
                      className={`cursor-pointer hover:bg-purple-50/50 ${
                        selectedIds.has(order.id) ? 'bg-purple-50' : ''
                      }`}
                      onClick={() => toggleSelection(order.id)}
                    >
                      <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(order.id)}
                          onChange={() => toggleSelection(order.id)}
                          className="w-4 h-4 cursor-pointer accent-purple-600"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 min-w-[160px]">
                          <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={order.productName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Image className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <span className="text-sm font-medium text-gray-900 line-clamp-2">
                            {order.productName}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center text-sm text-gray-600 whitespace-nowrap">
                        {order.poNumber}
                      </td>
                      <td className="px-3 py-2 text-center text-sm text-gray-900 whitespace-nowrap">
                        {unitPrice != null ? `¥${unitPrice.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-3 py-2 text-center text-sm text-gray-600 whitespace-nowrap">
                        {inboundQty.toLocaleString()}개
                      </td>
                      <td className="px-3 py-2 text-center text-sm text-gray-900 whitespace-nowrap">
                        {order.sellingPrice != null ? `₩${order.sellingPrice.toLocaleString()}` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-500">
        이미 입고 목록에 등록된 발주는 표시되지 않습니다. 입고예정수량은 한국도착 수량이 있으면 해당 값, 없으면 발주 수량입니다.
      </p>
    </div>
  );
}
