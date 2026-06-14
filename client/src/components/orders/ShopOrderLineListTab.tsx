import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
  ClipboardList,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  Package,
  Search,
  Truck,
} from 'lucide-react';
import { getFullImageUrl } from '../../api/purchaseOrderApi';
import { getShopBuyerById, getShopBuyers } from '../../api/shopBuyerApi';
import {
  createShopOrderBulkStatements,
  SHOP_ORDER_STATUS_OPTIONS,
  type ShopOrder,
  type ShopOrderBulkStatementGroup,
  type ShopOrderLine,
} from '../../api/shopOrderApi';
import type { ShopBuyer, ShopBuyerListItem } from '../buyers/types';
import {
  buildShopOrderLineListRows,
  exportShopOrderFormExcel,
  exportShopOrderTaxInvoiceExcel,
  exportShopOrderTrackingExcel,
  type ShopOrderLineListKind,
  type ShopOrderLineListRow,
} from '../../utils/shopOrderListExport';
import { findShopBuyerByCompanyName } from '../../utils/shopBuyerDisplay';
import { useShopOrderListPagination } from '../../hooks/useShopOrderListPagination';
import {
  deriveLineProgressStatus,
  EMPTY_LINE_FULFILLMENT_FILTERS,
  formatLineOrderRef,
  formatLineQuantity,
  getLineProgressStatusClass,
  hasActiveLineFulfillmentFilters,
  lineHasPayment,
  lineHasStatement,
  matchesLineDateRange,
  matchesLineFulfillmentFilters,
  type ShopOrderLineFulfillmentFilters,
} from '../../utils/shopOrderLineListUtils';
import { ShopBuyerInfoModal } from './ShopBuyerInfoModal';
import { ShopOrderListPagination } from './ShopOrderListPagination';
import { shopOrderDetailPath } from './shopOrderListNavigation';
import { ShopOrderReservationTransferModal, type ReservationTransferItem } from './ShopOrderReservationTransferModal';
import {
  ShopOrderStatementModal,
  type ShopOrderStatementGroupPreview,
} from './ShopOrderStatementModal';
import type { ShopOrderListTab } from './ShopOrderListTabs';

interface ShopOrderLineListTabProps {
  orders: ShopOrder[];
  listTab: ShopOrderListTab;
  lineKind: Extract<ShopOrderLineListKind, 'orders' | 'reservations'>;
  onReload: () => Promise<void>;
}

const ALL_STATUS = '전체';

const FULFILLMENT_FILTER_OPTIONS: Array<{
  key: keyof ShopOrderLineFulfillmentFilters;
  label: string;
}> = [
  { key: 'noStatement', label: '미발행 명세서' },
  { key: 'noPayment', label: '미입금' },
  { key: 'notArrived', label: '미도착' },
  { key: 'noTaxInvoice', label: '세금계산서 미발행' },
  { key: 'noTracking', label: '송장 미등록' },
];

function ProgressFlags({ line }: { line: ShopOrderLine }) {
  const flags = [
    { label: '명세서', checked: lineHasStatement(line) },
    { label: '입금', checked: lineHasPayment(line) },
    { label: '도착', checked: line.productArrived },
    { label: '세금', checked: line.taxInvoiceIssued },
  ];

  return (
    <div className="flex items-center justify-center gap-1.5">
      {flags.map((flag) => (
        <span
          key={flag.label}
          title={`${flag.label} ${flag.checked ? '완료' : '미완료'}`}
          className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-[10px] font-bold border ${
            flag.checked
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-gray-50 text-gray-400 border-gray-200'
          }`}
        >
          {flag.label.slice(0, 1)}
        </span>
      ))}
    </div>
  );
}

export function ShopOrderLineListTab({
  orders,
  listTab,
  lineKind,
  onReload,
}: ShopOrderLineListTabProps) {
  const isReservationTab = lineKind === 'reservations';
  const accentRingClass = isReservationTab ? 'focus:ring-amber-500' : 'focus:ring-emerald-500';
  const accentCheckboxClass = isReservationTab
    ? 'w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500 cursor-pointer'
    : 'w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer';
  const accentFilterActiveClass = isReservationTab
    ? 'bg-amber-600 text-white border-amber-600'
    : 'bg-emerald-600 text-white border-emerald-600';
  const accentCompanyLinkClass = isReservationTab
    ? 'text-left text-amber-800 hover:text-amber-950 hover:underline font-medium'
    : 'text-left text-emerald-700 hover:text-emerald-900 hover:underline font-medium';
  const emptyMessage = isReservationTab
    ? '등록된 예약 건이 없습니다. 제품 상세에서 「예약 추가」로 등록하세요.'
    : '등록된 판매 주문이 없습니다. 제품 상세에서 「주문 추가」로 등록하세요.';
  const orderRefPrefix = isReservationTab ? '예약' : undefined;
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUS);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [fulfillmentFilters, setFulfillmentFilters] = useState<ShopOrderLineFulfillmentFilters>(
    EMPTY_LINE_FULFILLMENT_FILTERS
  );
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [statementModalOpen, setStatementModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferItems, setTransferItems] = useState<ReservationTransferItem[]>([]);
  const [transferProductName, setTransferProductName] = useState('');
  const [statementGroups, setStatementGroups] = useState<ShopOrderStatementGroupPreview[]>([]);
  const [buyers, setBuyers] = useState<ShopBuyerListItem[]>([]);
  const [buyerModalOpen, setBuyerModalOpen] = useState(false);
  const [buyerModalLoading, setBuyerModalLoading] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState<ShopBuyer | null>(null);
  const [buyerModalCompanyName, setBuyerModalCompanyName] = useState('');
  const [buyerUnmatchedMessage, setBuyerUnmatchedMessage] = useState<string | null>(null);
  const [buyerOrderLineInfo, setBuyerOrderLineInfo] = useState<{
    address: string | null;
    recipientName: string | null;
    phoneNumber: string | null;
  } | null>(null);

  const checkboxClass = accentCheckboxClass;

  const loadBuyers = useCallback(async () => {
    try {
      const data = await getShopBuyers();
      setBuyers(data);
    } catch {
      setBuyers([]);
    }
  }, []);

  useEffect(() => {
    void loadBuyers();
  }, [loadBuyers]);

  const lineRows = useMemo(() => buildShopOrderLineListRows(orders, lineKind), [orders, lineKind]);

  const filteredRows = useMemo(() => {
    const lower = searchTerm.trim().toLowerCase();
    return lineRows.filter((row) => {
      const matchesSearch =
        !lower ||
        row.orderNumber.toLowerCase().includes(lower) ||
        formatLineOrderRef(row.line.lineOrderNumber, row.orderNumber, row.lineIndex).toLowerCase().includes(lower) ||
        (row.line.lineOrderNumber ?? '').toLowerCase().includes(lower) ||
        row.productName.toLowerCase().includes(lower) ||
        (row.line.companyName ?? '').toLowerCase().includes(lower) ||
        (row.line.recipientName ?? '').toLowerCase().includes(lower) ||
        (row.line.phoneNumber ?? '').toLowerCase().includes(lower) ||
        (row.line.address ?? '').toLowerCase().includes(lower) ||
        (row.line.trackingNumber ?? '').toLowerCase().includes(lower);
      const matchesStatus = statusFilter === ALL_STATUS || row.orderStatus === statusFilter;
      const matchesDate = matchesLineDateRange(row.orderDate, dateFrom, dateTo);
      const matchesFulfillment = matchesLineFulfillmentFilters(row, fulfillmentFilters);
      return matchesSearch && matchesStatus && matchesDate && matchesFulfillment;
    });
  }, [lineRows, searchTerm, statusFilter, dateFrom, dateTo, fulfillmentFilters]);

  const paginationResetKey = `${lineKind}|${searchTerm}|${statusFilter}|${dateFrom}|${dateTo}|${JSON.stringify(fulfillmentFilters)}`;
  const {
    paginatedItems: paginatedRows,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
  } = useShopOrderListPagination(filteredRows, paginationResetKey);

  const allPageSelected =
    paginatedRows.length > 0 && paginatedRows.every((row) => selectedRowKeys.has(row.rowKey));
  const somePageSelected = paginatedRows.some((row) => selectedRowKeys.has(row.rowKey));

  const toggleFulfillmentFilter = (key: keyof ShopOrderLineFulfillmentFilters) => {
    setFulfillmentFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const clearFulfillmentFilters = () => {
    setFulfillmentFilters(EMPTY_LINE_FULFILLMENT_FILTERS);
  };

  const handleToggleSelectAll = () => {
    setSelectedRowKeys((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        paginatedRows.forEach((row) => next.delete(row.rowKey));
      } else {
        paginatedRows.forEach((row) => next.add(row.rowKey));
      }
      return next;
    });
  };

  const handleToggleSelect = (rowKey: string) => {
    setSelectedRowKeys((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) {
        next.delete(rowKey);
      } else {
        next.add(rowKey);
      }
      return next;
    });
  };

  const getSelectedRows = (): ShopOrderLineListRow[] | null => {
    if (selectedRowKeys.size === 0) {
      alert('판매 주문을 선택해 주세요.');
      return null;
    }
    return lineRows.filter((row) => selectedRowKeys.has(row.rowKey));
  };

  const buildStatementGroupTitle = (group: ShopOrderBulkStatementGroup): string => {
    if (group.lineCount > 1) {
      return `${group.companyName} (통합 ${group.lineCount}건)`;
    }
    return group.companyName;
  };

  const handleBulkCreateStatements = async () => {
    const selectedRows = getSelectedRows();
    if (!selectedRows) return;

    const orderIds = [...new Set(selectedRows.map((row) => row.shopOrderId))];

    setBulkBusy(true);
    try {
      const result = await createShopOrderBulkStatements(orderIds);

      if (result.groups.length === 0) {
        alert('선택한 주문에 판매 주문이 없습니다.');
        return;
      }

      await onReload();

      setStatementGroups(
        result.groups.map((group) => ({
          id: group.groupKey,
          title: buildStatementGroupTitle(group),
          html: group.html,
        }))
      );
      setStatementModalOpen(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : '명세서 생성 중 오류가 발생했습니다.');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleExportTrackingExcel = async () => {
    const selectedRows = getSelectedRows();
    if (!selectedRows) return;

    setBulkBusy(true);
    try {
      await exportShopOrderTrackingExcel(selectedRows);
    } catch (err) {
      alert(err instanceof Error ? err.message : '송장 엑셀 생성 중 오류가 발생했습니다.');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleExportTaxInvoiceExcel = async () => {
    const selectedRows = getSelectedRows();
    if (!selectedRows) return;

    setBulkBusy(true);
    try {
      await exportShopOrderTaxInvoiceExcel(selectedRows);
    } catch (err) {
      alert(err instanceof Error ? err.message : '세금계산서 엑셀 생성 중 오류가 발생했습니다.');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleExportOrderFormExcel = async () => {
    const selectedRows = getSelectedRows();
    if (!selectedRows) return;

    setBulkBusy(true);
    try {
      await exportShopOrderFormExcel(selectedRows);
    } catch (err) {
      alert(err instanceof Error ? err.message : '주문서 엑셀 생성 중 오류가 발생했습니다.');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleOpenTransferModal = () => {
    const selectedRows = getSelectedRows();
    if (!selectedRows || selectedRows.length === 0) return;

    const productNames = [...new Set(selectedRows.map((row) => row.productName.trim()))];
    if (productNames.length !== 1) {
      alert('동일한 제품명의 예약만 함께 이동할 수 있습니다.');
      return;
    }

    setTransferProductName(productNames[0]);
    setTransferItems(
      selectedRows.map((row) => ({
        shopOrderId: row.shopOrderId,
        lineId: row.line.id,
      }))
    );
    setTransferModalOpen(true);
  };

  const handleReservationTransferred = async (targetOrderId: string, transferredCount: number) => {
    setSelectedRowKeys(new Set());
    setTransferProductName('');
    await onReload();
    alert(`${transferredCount.toLocaleString()}건의 예약을 선택한 주문으로 이동했습니다.`);
    navigate(shopOrderDetailPath(targetOrderId, listTab));
  };

  const handleViewDetail = (shopOrderId: string) => {
    navigate(shopOrderDetailPath(shopOrderId, listTab));
  };

  const handleCompanyNameClick = async (line: ShopOrderLine, event: React.MouseEvent) => {
    event.stopPropagation();

    const companyName = line.companyName?.trim();
    if (!companyName) return;

    setBuyerModalOpen(true);
    setBuyerModalLoading(true);
    setSelectedBuyer(null);
    setBuyerModalCompanyName(companyName);
    setBuyerUnmatchedMessage(null);
    setBuyerOrderLineInfo({
      address: line.address,
      recipientName: line.recipientName,
      phoneNumber: line.phoneNumber,
    });

    try {
      let buyerList = buyers;
      if (buyerList.length === 0) {
        buyerList = await getShopBuyers();
        setBuyers(buyerList);
      }

      const match = findShopBuyerByCompanyName(companyName, buyerList);
      if (match === 'ambiguous') {
        setBuyerUnmatchedMessage(
          `「${companyName}」과(와) 일치하는 구매자가 여러 건 등록되어 있습니다.`
        );
        return;
      }
      if (!match) {
        return;
      }

      const buyer = await getShopBuyerById(match.id);
      setSelectedBuyer(buyer);
    } catch (err) {
      setBuyerUnmatchedMessage(
        err instanceof Error ? err.message : '구매자 정보를 불러오지 못했습니다.'
      );
    } finally {
      setBuyerModalLoading(false);
    }
  };

  const handleCloseBuyerModal = () => {
    setBuyerModalOpen(false);
    setSelectedBuyer(null);
    setBuyerUnmatchedMessage(null);
    setBuyerOrderLineInfo(null);
  };

  const bulkActionButtonClass =
    'inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  const fulfillmentFilterActive = hasActiveLineFulfillmentFilters(fulfillmentFilters);

  if (lineRows.length === 0) {
    return <div className="py-16 text-center text-gray-500">{emptyMessage}</div>;
  }

  return (
    <>
      <div className="space-y-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="주문번호, 상품명, 상호, 수령인, 전화, 주소, 송장으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${accentRingClass}`}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${accentRingClass} appearance-none bg-white`}
            title="제품 상태 필터"
          >
            <option value={ALL_STATUS}>제품 상태: {ALL_STATUS}</option>
            {SHOP_ORDER_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col xl:flex-row xl:items-end gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-600 mr-1">업무 필터</span>
            {FULFILLMENT_FILTER_OPTIONS.map((option) => {
              const active = fulfillmentFilters[option.key];
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => toggleFulfillmentFilter(option.key)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    active
                      ? accentFilterActiveClass
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
            {fulfillmentFilterActive && (
              <button
                type="button"
                onClick={clearFulfillmentFilters}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
              >
                필터 초기화
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:ml-auto">
            <span className="text-sm font-medium text-gray-600">등록일</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={`px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${accentRingClass}`}
            />
            <span className="text-gray-400">~</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={`px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${accentRingClass}`}
            />
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
              >
                날짜 초기화
              </button>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-500">
          {filteredRows.length.toLocaleString()}건 표시
          {fulfillmentFilterActive || dateFrom || dateTo || statusFilter !== ALL_STATUS || searchTerm
            ? ' (필터 적용됨)'
            : ''}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50/80">
          <span className="text-sm text-gray-600 mr-1">선택 {selectedRowKeys.size}건</span>
          {isReservationTab && (
            <button
              type="button"
              disabled={bulkBusy || selectedRowKeys.size === 0}
              onClick={() => handleOpenTransferModal()}
              className={`${bulkActionButtonClass} border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100`}
            >
              {bulkBusy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRightLeft className="w-4 h-4" />
              )}
              주문 이동하기
            </button>
          )}
          <button
            type="button"
            disabled={bulkBusy || selectedRowKeys.size === 0}
            onClick={() => void handleBulkCreateStatements()}
            className={`${bulkActionButtonClass} border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100`}
          >
            {bulkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            명세서 만들기
          </button>
          <button
            type="button"
            disabled={bulkBusy || selectedRowKeys.size === 0}
            onClick={() => void handleExportOrderFormExcel()}
            className={`${bulkActionButtonClass} border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100`}
          >
            {bulkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
            주문서 엑셀 만들기
          </button>
          <button
            type="button"
            disabled={bulkBusy || selectedRowKeys.size === 0}
            onClick={() => void handleExportTrackingExcel()}
            className={`${bulkActionButtonClass} border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100`}
          >
            {bulkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
            송장엑셀 만들기
          </button>
          <button
            type="button"
            disabled={bulkBusy || selectedRowKeys.size === 0}
            onClick={() => void handleExportTaxInvoiceExcel()}
            className={`${bulkActionButtonClass} border-green-200 text-green-700 bg-green-50 hover:bg-green-100`}
          >
            {bulkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            세금계산서 엑셀 만들기
          </button>
        </div>
        {filteredRows.length > 0 && (
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
          {filteredRows.length === 0 ? (
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
                  <th className="px-4 py-3 text-left text-gray-600 whitespace-nowrap">주문</th>
                  <th className="px-4 py-3 text-left text-gray-600 whitespace-nowrap">등록일</th>
                  <th className="px-4 py-3 text-left text-gray-600 whitespace-nowrap">사진</th>
                  <th className="px-4 py-3 text-left text-gray-600 whitespace-nowrap">상호명</th>
                  <th className="px-4 py-3 text-left text-gray-600 whitespace-nowrap">상품명</th>
                  <th className="px-4 py-3 text-left text-gray-600 whitespace-nowrap">수량</th>
                  <th className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">총계(VAT포함)</th>
                  <th className="px-4 py-3 text-left text-gray-600 whitespace-nowrap">수령인</th>
                  <th className="px-4 py-3 text-left text-gray-600 whitespace-nowrap">송장</th>
                  <th className="px-4 py-3 text-center text-gray-600 whitespace-nowrap">진행</th>
                  <th className="px-4 py-3 text-left text-gray-600 whitespace-nowrap">건별 상태</th>
                  <th className="px-4 py-3 text-left text-gray-600 whitespace-nowrap">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedRows.map((row) => {
                  const { line } = row;
                  const progressStatus = deriveLineProgressStatus(line);
                  const imageUrl = row.productMainImage
                    ? getFullImageUrl(row.productMainImage)
                    : null;

                  return (
                    <tr
                      key={row.rowKey}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleViewDetail(row.shopOrderId)}
                    >
                      <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedRowKeys.has(row.rowKey)}
                          onChange={() => handleToggleSelect(row.rowKey)}
                          className={checkboxClass}
                          aria-label={`${formatLineOrderRef(row.line.lineOrderNumber, row.orderNumber, row.lineIndex, orderRefPrefix)} 선택`}
                        />
                      </td>
                      <td
                        className="px-4 py-4 text-gray-900 whitespace-nowrap font-medium select-text cursor-text"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        {formatLineOrderRef(
                          row.line.lineOrderNumber,
                          row.orderNumber,
                          row.lineIndex,
                          orderRefPrefix
                        )}
                      </td>
                      <td className="px-4 py-4 text-gray-600 whitespace-nowrap">{row.orderDate ?? '-'}</td>
                      <td className="px-4 py-4">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={row.productName}
                            className="w-10 h-10 rounded object-cover border border-gray-200"
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded border border-gray-200 bg-gray-100 flex items-center justify-center"
                            aria-hidden
                          >
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-gray-900" onClick={(e) => e.stopPropagation()}>
                        {line.companyName ? (
                          <button
                            type="button"
                            onClick={(e) => void handleCompanyNameClick(line, e)}
                            className={accentCompanyLinkClass}
                            title="구매자 정보 보기"
                          >
                            {line.companyName}
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-4 text-gray-600">{row.productName}</td>
                      <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                        {formatLineQuantity(line)}
                      </td>
                      <td className="px-4 py-4 text-gray-900 font-medium text-right whitespace-nowrap">
                        {line.totalAmount != null && line.totalAmount > 0
                          ? `₩${line.totalAmount.toLocaleString()}`
                          : '-'}
                      </td>
                      <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                        {line.recipientName ?? '-'}
                      </td>
                      <td className="px-4 py-4 text-gray-600 font-mono text-sm whitespace-nowrap">
                        {line.trackingNumber ?? '-'}
                      </td>
                      <td className="px-4 py-4">
                        <ProgressFlags line={line} />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-sm ${getLineProgressStatusClass(progressStatus)}`}
                        >
                          {progressStatus}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetail(row.shopOrderId);
                          }}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="제품 상세 보기"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {filteredRows.length > 0 && (
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

      <ShopBuyerInfoModal
        isOpen={buyerModalOpen}
        onClose={handleCloseBuyerModal}
        buyer={selectedBuyer}
        isLoading={buyerModalLoading}
        companyName={buyerModalCompanyName}
        unmatchedMessage={buyerUnmatchedMessage}
        orderLineInfo={buyerOrderLineInfo ?? undefined}
      />

      {transferModalOpen && (
        <ShopOrderReservationTransferModal
          isOpen={transferModalOpen}
          items={transferItems}
          productName={transferProductName}
          onClose={() => {
            setTransferModalOpen(false);
            setTransferProductName('');
          }}
          onTransferred={(targetOrderId, transferredCount) =>
            void handleReservationTransferred(targetOrderId, transferredCount)
          }
        />
      )}

      <ShopOrderStatementModal
        isOpen={statementModalOpen}
        groups={statementGroups}
        title="거래명세표 미리보기"
        onClose={() => setStatementModalOpen(false)}
      />
    </>
  );
}
