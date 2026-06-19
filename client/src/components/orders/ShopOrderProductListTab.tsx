import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  Trash2,
  Truck,
} from 'lucide-react';
import {
  createShopOrderBulkStatements,
  deleteShopOrder,
  getShopOrderById,
  getShopOrderStatusClass,
  SHOP_ORDER_STATUS_OPTIONS,
  type ShopOrder,
  type ShopOrderBulkStatementGroup,
} from '../../api/shopOrderApi';
import { getFullImageUrl } from '../../api/purchaseOrderApi';
import { useShopOrderListPagination } from '../../hooks/useShopOrderListPagination';
import { useShopOrderListSearch } from '../../hooks/useShopOrderListSearch';
import { useShopOrderProductListUrlState } from '../../hooks/useShopOrderListTabUrlState';
import { SearchBar } from '../ui/search-bar';
import {
  exportShopOrderFormExcel,
  exportShopOrderTaxInvoiceExcel,
  exportShopOrderTrackingExcel,
  flattenShopOrderLines,
} from '../../utils/shopOrderListExport';
import {
  canDeleteShopOrder,
  SHOP_ORDER_DELETE_BLOCKED_MESSAGE,
} from '../../utils/shopOrderDeleteUtils';
import { shopOrderDetailPath, shopOrderListReturnPath } from './shopOrderListNavigation';
import { SHOP_ORDER_LIST_ALL_STATUS } from './shopOrderListUrlParams';
import { ShopOrderListPagination } from './ShopOrderListPagination';
import { ShopOrderStatementCreateDialog } from './ShopOrderStatementCreateDialog';
import {
  ShopOrderStatementModal,
  type ShopOrderStatementGroupPreview,
} from './ShopOrderStatementModal';
import type { ShopOrderListTab } from './ShopOrderListTabs';

const ALL_STATUS = SHOP_ORDER_LIST_ALL_STATUS;

interface ShopOrderProductListTabProps {
  orders: ShopOrder[];
  listTab: ShopOrderListTab;
  onReload: () => Promise<void>;
}

export function ShopOrderProductListTab({ orders, listTab, onReload }: ShopOrderProductListTabProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    urlSearchTerm,
    persistSearchTerm,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
  } = useShopOrderProductListUrlState();
  const { searchTerm, setSearchTerm, clearSearch } = useShopOrderListSearch(
    urlSearchTerm,
    persistSearchTerm
  );
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [statementModalOpen, setStatementModalOpen] = useState(false);
  const [statementGroups, setStatementGroups] = useState<ShopOrderStatementGroupPreview[]>([]);
  const [statementCreateDialogOpen, setStatementCreateDialogOpen] = useState(false);
  const [pendingStatementLineCount, setPendingStatementLineCount] = useState(0);
  const [pendingStatementItems, setPendingStatementItems] = useState<
    Array<{ shopOrderId: string; lineId: string }>
  >([]);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  const checkboxClass =
    'w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer';

  const filteredOrders = useMemo(() => {
    const lower = searchTerm.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesSearch =
        !lower ||
        order.orderNumber.toLowerCase().includes(lower) ||
        order.productName.toLowerCase().includes(lower);
      const matchesStatus = statusFilter === ALL_STATUS || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const paginationResetKey = `${searchTerm}|${statusFilter}`;
  const {
    paginatedItems: paginatedOrders,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
  } = useShopOrderListPagination(filteredOrders, paginationResetKey, {
    page: currentPage,
    onPageChange: setCurrentPage,
  });

  const listReturnPath = shopOrderListReturnPath(location.pathname, location.search);

  const allPageSelected =
    paginatedOrders.length > 0 && paginatedOrders.every((order) => selectedOrderIds.has(order.id));
  const somePageSelected = paginatedOrders.some((order) => selectedOrderIds.has(order.id));

  const handleToggleSelectAll = () => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        paginatedOrders.forEach((order) => next.delete(order.id));
      } else {
        paginatedOrders.forEach((order) => next.add(order.id));
      }
      return next;
    });
  };

  const handleToggleSelect = (orderId: string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const handleViewDetail = (orderId: string) => {
    navigate(shopOrderDetailPath(orderId, listTab, listReturnPath));
  };

  const handleDeleteProductOrder = async (order: ShopOrder, event: React.MouseEvent) => {
    event.stopPropagation();

    if (!canDeleteShopOrder(order)) {
      alert(SHOP_ORDER_DELETE_BLOCKED_MESSAGE);
      return;
    }

    if (
      !window.confirm(
        `「${order.productName}」(${order.orderNumber}) 제품 주문을 삭제하시겠습니까?`
      )
    ) {
      return;
    }

    setDeletingOrderId(order.id);
    try {
      await deleteShopOrder(order.id);
      await onReload();
    } catch (err) {
      alert(err instanceof Error ? err.message : '제품 주문 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingOrderId(null);
    }
  };

  const getSelectedOrderIds = (): string[] | null => {
    if (selectedOrderIds.size === 0) {
      alert('주문을 선택해 주세요.');
      return null;
    }
    return Array.from(selectedOrderIds);
  };

  const loadSelectedOrdersWithLines = async (orderIds: string[]): Promise<ShopOrder[]> => {
    return Promise.all(orderIds.map((id) => getShopOrderById(id)));
  };

  const buildStatementGroupTitle = (group: ShopOrderBulkStatementGroup): string => {
    if (group.lineCount > 1) {
      return `${group.companyName} (통합 ${group.lineCount}건)`;
    }
    return group.companyName;
  };

  const handleBulkCreateStatements = async () => {
    const orderIds = getSelectedOrderIds();
    if (!orderIds) return;

    setBulkBusy(true);
    try {
      const selectedOrders = await loadSelectedOrdersWithLines(orderIds);
      const items = selectedOrders.flatMap((order) =>
        order.lines.map((line) => ({
          shopOrderId: order.id,
          lineId: line.id,
        }))
      );

      if (items.length === 0) {
        alert('선택한 주문에 명세서를 생성할 주문건이 없습니다.');
        return;
      }

      setPendingStatementItems(items);
      setPendingStatementLineCount(items.length);
      setStatementCreateDialogOpen(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : '주문 정보를 불러오지 못했습니다.');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleConfirmCreateStatements = async (statementDate: string) => {
    if (pendingStatementItems.length === 0) return;

    setStatementCreateDialogOpen(false);
    setBulkBusy(true);
    try {
      const result = await createShopOrderBulkStatements(pendingStatementItems, { statementDate });

      if (result.groups.length === 0) {
        alert('선택한 주문에 판매 주문이 없습니다.');
        return;
      }

      await onReload();

      setStatementGroups(
        result.groups.map((group) => ({
          id: group.statementGroupId ?? group.groupKey,
          title: buildStatementGroupTitle(group),
          html: group.html,
        }))
      );
      setStatementModalOpen(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : '명세서 생성 중 오류가 발생했습니다.');
    } finally {
      setBulkBusy(false);
      setPendingStatementItems([]);
      setPendingStatementLineCount(0);
    }
  };

  const handleExportTrackingExcel = async () => {
    const orderIds = getSelectedOrderIds();
    if (!orderIds) return;

    setBulkBusy(true);
    try {
      const selectedOrders = await loadSelectedOrdersWithLines(orderIds);
      const rows = flattenShopOrderLines(selectedOrders);

      if (rows.length === 0) {
        alert('선택한 주문에 내보낼 판매 주문이 없습니다.');
        return;
      }

      await exportShopOrderTrackingExcel(rows);
    } catch (err) {
      alert(err instanceof Error ? err.message : '송장 엑셀 생성 중 오류가 발생했습니다.');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleExportTaxInvoiceExcel = async () => {
    const orderIds = getSelectedOrderIds();
    if (!orderIds) return;

    setBulkBusy(true);
    try {
      const selectedOrders = await loadSelectedOrdersWithLines(orderIds);
      const rows = flattenShopOrderLines(selectedOrders);

      if (rows.length === 0) {
        alert('선택한 주문에 내보낼 판매 주문이 없습니다.');
        return;
      }

      await exportShopOrderTaxInvoiceExcel(rows);
    } catch (err) {
      alert(err instanceof Error ? err.message : '세금계산서 엑셀 생성 중 오류가 발생했습니다.');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleExportOrderFormExcel = async () => {
    const orderIds = getSelectedOrderIds();
    if (!orderIds) return;

    setBulkBusy(true);
    try {
      const selectedOrders = await loadSelectedOrdersWithLines(orderIds);
      const rows = flattenShopOrderLines(selectedOrders);

      if (rows.length === 0) {
        alert('선택한 주문에 내보낼 판매 주문이 없습니다.');
        return;
      }

      await exportShopOrderFormExcel(rows);
    } catch (err) {
      alert(err instanceof Error ? err.message : '주문서 엑셀 생성 중 오류가 발생했습니다.');
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkActionButtonClass =
    'inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  if (orders.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500">
        등록된 주문이 없습니다. 재고 관리에서 「주문관리에 등록하기」로 제품을 추가하세요.
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          onClear={clearSearch}
          placeholder="주문번호, 상품명으로 검색..."
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none bg-white"
        >
          <option value={ALL_STATUS}>{ALL_STATUS}</option>
          {SHOP_ORDER_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50/80">
          <span className="text-sm text-gray-600 mr-1">선택 {selectedOrderIds.size}건</span>
          <button
            type="button"
            disabled={bulkBusy || selectedOrderIds.size === 0}
            onClick={() => void handleBulkCreateStatements()}
            className={`${bulkActionButtonClass} border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100`}
          >
            {bulkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            명세서 만들기
          </button>
          <button
            type="button"
            disabled={bulkBusy || selectedOrderIds.size === 0}
            onClick={() => void handleExportOrderFormExcel()}
            className={`${bulkActionButtonClass} border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100`}
          >
            {bulkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
            주문서 엑셀 만들기
          </button>
          <button
            type="button"
            disabled={bulkBusy || selectedOrderIds.size === 0}
            onClick={() => void handleExportTrackingExcel()}
            className={`${bulkActionButtonClass} border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100`}
          >
            {bulkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
            송장엑셀 만들기
          </button>
          <button
            type="button"
            disabled={bulkBusy || selectedOrderIds.size === 0}
            onClick={() => void handleExportTaxInvoiceExcel()}
            className={`${bulkActionButtonClass} border-green-200 text-green-700 bg-green-50 hover:bg-green-100`}
          >
            {bulkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            세금계산서 엑셀 만들기
          </button>
        </div>
        {filteredOrders.length > 0 && (
          <ShopOrderListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={setCurrentPage}
            className="border-t-0 border-b border-gray-200 bg-gray-50/50"
          />
        )}
        <div className="overflow-x-auto">
          {filteredOrders.length === 0 ? (
            <div className="py-12 text-center text-gray-500">검색 결과가 없습니다.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      ref={(el) => {
                        if (el) {
                          el.indeterminate = somePageSelected && !allPageSelected;
                        }
                      }}
                      onChange={handleToggleSelectAll}
                      className={checkboxClass}
                      aria-label="현재 페이지 전체 선택"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-gray-600">주문번호</th>
                  <th className="px-6 py-3 text-left text-gray-600">등록일</th>
                  <th className="px-6 py-3 text-left text-gray-600">사진</th>
                  <th className="px-6 py-3 text-left text-gray-600">상품명</th>
                  <th className="px-6 py-3 text-left text-gray-600">판매 주문</th>
                  <th className="px-6 py-3 text-left text-gray-600">한박스 입수량</th>
                  <th className="px-6 py-3 text-left text-gray-600">단가</th>
                  <th className="px-6 py-3 text-left text-gray-600">수량</th>
                  <th className="px-6 py-3 text-left text-gray-600">재고</th>
                  <th className="px-6 py-3 text-left text-gray-600">누적 판매(VAT미포함)</th>
                  <th className="px-6 py-3 text-left text-gray-600">누적 판매(VAT포함)</th>
                  <th className="px-6 py-3 text-left text-gray-600">상태</th>
                  <th className="px-6 py-3 text-left text-gray-600">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedOrders.map((order) => {
                  const imageUrl = order.productMainImage
                    ? getFullImageUrl(order.productMainImage)
                    : null;

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleViewDetail(order.id)}
                    >
                      <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.has(order.id)}
                          onChange={() => handleToggleSelect(order.id)}
                          className={checkboxClass}
                          aria-label={`${order.orderNumber} 선택`}
                        />
                      </td>
                      <td
                        className="px-6 py-4 text-gray-900 select-text cursor-text"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        {order.orderNumber}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{order.orderDate ?? '-'}</td>
                      <td className="px-6 py-4">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={order.productName}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{order.productName}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {order.lineCount > 0 ? `${order.lineCount}건` : '-'}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {order.quantityPerBox > 0 ? `${order.quantityPerBox.toLocaleString()}개` : '-'}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {order.sellingPrice != null ? `₩${order.sellingPrice.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{order.quantity.toLocaleString()}개</td>
                      <td className="px-6 py-4 text-blue-700">{order.stockQuantity.toLocaleString()}개</td>
                      <td className="px-6 py-4 text-gray-900">
                        {order.totalProductSupplyAmount > 0
                          ? `₩${order.totalProductSupplyAmount.toLocaleString()}`
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-gray-900 font-medium">
                        {order.totalSalesAmount > 0
                          ? `₩${order.totalSalesAmount.toLocaleString()}`
                          : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-sm ${getShopOrderStatusClass(order.status)}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetail(order.id);
                            }}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="상세 보기"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={deletingOrderId === order.id}
                            onClick={(e) => void handleDeleteProductOrder(order, e)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="제품 주문 삭제"
                          >
                            {deletingOrderId === order.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {filteredOrders.length > 0 && (
          <ShopOrderListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      <ShopOrderStatementCreateDialog
        isOpen={statementCreateDialogOpen}
        lineCount={pendingStatementLineCount}
        onConfirm={(statementDate) => void handleConfirmCreateStatements(statementDate)}
        onCancel={() => {
          setStatementCreateDialogOpen(false);
          setPendingStatementItems([]);
          setPendingStatementLineCount(0);
        }}
      />

      <ShopOrderStatementModal
        isOpen={statementModalOpen}
        groups={statementGroups}
        title="거래명세표 미리보기"
        onClose={() => setStatementModalOpen(false)}
      />
    </>
  );
}
