import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
  ArrowUpDown,
  ClipboardList,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  Package,
  Truck,
  X,
} from 'lucide-react';
import { getFullImageUrl } from '../../api/purchaseOrderApi';
import { getShopBuyerById, getShopBuyers } from '../../api/shopBuyerApi';
import {
  createShopOrderBulkStatements,
  deleteShopOrderLine,
  SHOP_ORDER_STATUS_OPTIONS,
  syncShopOrderDetail,
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
import {
  findShopBuyerByCompanyName,
  normalizeShopBuyerCompanyName,
  resolveCompanyNameDisplay,
} from '../../utils/shopBuyerDisplay';
import { buildBuyerModalOrderLineGroups } from '../../utils/shopBuyerModalOrderLines';
import { useShopOrderListPagination } from '../../hooks/useShopOrderListPagination';
import { useShopOrderListSearch } from '../../hooks/useShopOrderListSearch';
import { useShopOrderLineListUrlState } from '../../hooks/useShopOrderListTabUrlState';
import { SearchBar } from '../ui/search-bar';
import { ShopOrderProgressFlagBadge } from './ShopOrderProgressFlagBadge';
import {
  deriveLineProgressStatus,
  formatLineOrderRef,
  formatLineQuantity,
  getLineProgressStatusClass,
  hasActiveLineFulfillmentFilters,
  lineHasPayment,
  lineHasStatement,
  lineHasStatementDelivered,
  matchesLineRowDateRange,
  matchesLineFulfillmentFilters,
  sortShopOrderLineRowsByCompanyAddress,
  lineInPreShipmentPhase,
  lineHasTracking,
  analyzeLineRemovalStatementPolicy,
  type LineRemovalStatementPolicy,
  type ShopOrderLineFulfillmentFilters,
} from '../../utils/shopOrderLineListUtils';
import { ShopBuyerInfoModal } from './ShopBuyerInfoModal';
import { ShopOrderListPagination } from './ShopOrderListPagination';
import { shopOrderDetailPath, shopOrderListReturnPath } from './shopOrderListNavigation';
import { SHOP_ORDER_LINE_DATE_FIELD_OPTIONS, SHOP_ORDER_LIST_ALL_STATUS } from './shopOrderListUrlParams';
import { ShopOrderReservationTransferModal, type ReservationTransferItem } from './ShopOrderReservationTransferModal';
import { ShopOrderStatementCreateDialog } from './ShopOrderStatementCreateDialog';
import {
  ShopOrderStatementModal,
  type ShopOrderStatementGroupPreview,
} from './ShopOrderStatementModal';
import { ShopOrderStatementChangeNoticeDialog } from './ShopOrderStatementChangeNoticeDialog';
import { ShopLineDeliveryStatusLink } from '../shipping/ShopLineDeliveryStatusLink';
import type { LineShipmentInfo } from '../../utils/shopLineShipmentUtils';
import {
  lineHasDefaultDeliveryFee,
  SHOP_ORDER_DEFAULT_DELIVERY_FEE,
} from '../../utils/shopOrderCalculations';
import {
  collectRelatedStatementRefsForLineSync,
  type RelatedStatementRef,
} from '../../utils/shopOrderStatementReissueNotice';
import { buildShopStatementsFocusPath } from '../../utils/shopStatementNavigation';

import type { ShopOrderListTab } from './ShopOrderListTabs';

interface ShopOrderLineListTabProps {
  orders: ShopOrder[];
  listTab: ShopOrderListTab;
  lineKind: Extract<ShopOrderLineListKind, 'orders' | 'reservations'>;
  lineShipmentMap: Map<string, LineShipmentInfo>;
  onReload: () => Promise<void>;
  onOrderPatched: (order: ShopOrder) => void;
}

const ALL_STATUS = SHOP_ORDER_LIST_ALL_STATUS;

const FULFILLMENT_FILTER_OPTIONS: Array<{
  key: keyof ShopOrderLineFulfillmentFilters;
  label: string;
}> = [
  { key: 'noStatement', label: '미발행 명세서' },
  { key: 'noPayment', label: '미입금' },
  { key: 'notArrived', label: '미도착' },
  { key: 'noTaxInvoice', label: '세금계산서 미발행' },
  { key: 'noTracking', label: '송장 미등록' },
  { key: 'shippingReady', label: '출고준비' },
];

function buildRemoveLineConfirmMessage(
  line: ShopOrderLine,
  orderRef: string,
  policy: LineRemovalStatementPolicy
): string {
  if (policy.blocked) {
    return policy.blockReason ?? '제거할 수 없습니다.';
  }

  const notices: string[] = [];

  if (policy.willRegenerateGroup) {
    notices.push(
      `· 통합 명세서 ${policy.groupSize}건 중 1건을 제거합니다. 남은 ${policy.remainingCount}건으로 명세서가 다시 생성됩니다.`
    );
  }

  if (lineHasStatement(line)) {
    notices.push(
      line.statementDelivered
        ? '· 발행·전달된 명세서 파일이 삭제됩니다.'
        : '· 발행된 명세서 파일이 삭제됩니다.'
    );
  }
  if (lineHasTracking(line)) {
    notices.push('· 등록된 송장·배송 연결 정보가 해제됩니다.');
  }

  const noticeBlock =
    notices.length > 0 ? `\n\n${notices.join('\n')}\n\n이 작업은 되돌릴 수 없습니다.` : '';

  return `「${orderRef}」 주문 건을 제거하시겠습니까?${noticeBlock}`;
}

function ProgressFlags({ line }: { line: ShopOrderLine }) {
  const flags: Array<{ label: string; display: string; checked: boolean }> = [
    { label: '명세서', display: '명', checked: lineHasStatement(line) },
    { label: '명세서 전달', display: '명발', checked: lineHasStatementDelivered(line) },
    { label: '입금', display: '입', checked: lineHasPayment(line) },
    { label: '세금', display: '세', checked: line.taxInvoiceIssued },
  ];

  return (
    <div className="flex items-center justify-center gap-1.5">
      {flags.map((flag) => (
        <ShopOrderProgressFlagBadge
          key={flag.label}
          label={flag.label}
          display={flag.display}
          checked={flag.checked}
        />
      ))}
    </div>
  );
}

export function ShopOrderLineListTab({
  orders,
  listTab,
  lineKind,
  lineShipmentMap,
  onReload,
  onOrderPatched,
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
  const location = useLocation();
  const {
    urlSearchTerm,
    persistSearchTerm,
    statusFilter,
    setStatusFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    dateField,
    setDateField,
    clearDateFilter,
    sortByCompanyAddress,
    toggleSortByCompanyAddress,
    fulfillmentFilters,
    toggleFulfillmentFilter,
    clearFulfillmentFilters,
    currentPage,
    setCurrentPage,
  } = useShopOrderLineListUrlState(lineKind);
  const { searchTerm, setSearchTerm, clearSearch } = useShopOrderListSearch(
    urlSearchTerm,
    persistSearchTerm
  );
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [statementModalOpen, setStatementModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferItems, setTransferItems] = useState<ReservationTransferItem[]>([]);
  const [transferProductName, setTransferProductName] = useState('');
  const [statementGroups, setStatementGroups] = useState<ShopOrderStatementGroupPreview[]>([]);
  const [statementCreateDialogOpen, setStatementCreateDialogOpen] = useState(false);
  const [pendingStatementItems, setPendingStatementItems] = useState<
    Array<{ shopOrderId: string; lineId: string }>
  >([]);
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
  const [deliveryFeeSavingRowKey, setDeliveryFeeSavingRowKey] = useState<string | null>(null);
  const [vatExemptSavingRowKey, setVatExemptSavingRowKey] = useState<string | null>(null);
  const [shippingReadySavingRowKey, setShippingReadySavingRowKey] = useState<string | null>(null);
  const [removingLineRowKey, setRemovingLineRowKey] = useState<string | null>(null);
  const [statementChangeNotice, setStatementChangeNotice] = useState<{
    statements: RelatedStatementRef[];
    onConfirm: () => Promise<void>;
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
        buyers.some(
          (buyer) =>
            buyer.kakaoId &&
            buyer.kakaoId.toLowerCase().includes(lower) &&
            normalizeShopBuyerCompanyName(buyer.companyName) ===
              normalizeShopBuyerCompanyName(row.line.companyName)
        ) ||
        (row.line.recipientName ?? '').toLowerCase().includes(lower) ||
        (row.line.phoneNumber ?? '').toLowerCase().includes(lower) ||
        (row.line.address ?? '').toLowerCase().includes(lower) ||
        (row.line.trackingNumber ?? '').toLowerCase().includes(lower);
      const matchesStatus = statusFilter === ALL_STATUS || row.orderStatus === statusFilter;
      const matchesDate = matchesLineRowDateRange(row, dateField, dateFrom, dateTo);
      const matchesFulfillment = matchesLineFulfillmentFilters(row, fulfillmentFilters);
      return matchesSearch && matchesStatus && matchesDate && matchesFulfillment;
    });
  }, [lineRows, searchTerm, statusFilter, dateField, dateFrom, dateTo, fulfillmentFilters, buyers]);

  const displayRows = useMemo(() => {
    if (!sortByCompanyAddress) return filteredRows;
    return sortShopOrderLineRowsByCompanyAddress(filteredRows);
  }, [filteredRows, sortByCompanyAddress]);

  const dateFilterActive = Boolean(dateFrom || dateTo);
  const paginationResetKey = `${lineKind}|${searchTerm}|${statusFilter}|${dateField}|${dateFrom}|${dateTo}|${sortByCompanyAddress}|${JSON.stringify(fulfillmentFilters)}`;
  const {
    paginatedItems: paginatedRows,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
  } = useShopOrderListPagination(displayRows, paginationResetKey, {
    page: currentPage,
    onPageChange: setCurrentPage,
  });

  const allPageSelected =
    paginatedRows.length > 0 && paginatedRows.every((row) => selectedRowKeys.has(row.rowKey));
  const somePageSelected = paginatedRows.some((row) => selectedRowKeys.has(row.rowKey));

  const listReturnPath = shopOrderListReturnPath(location.pathname, location.search);

  const buyerModalOrderLineGroups = useMemo(() => {
    if (!buyerModalCompanyName.trim()) return null;
    return buildBuyerModalOrderLineGroups(orders, lineShipmentMap, buyerModalCompanyName);
  }, [orders, lineShipmentMap, buyerModalCompanyName]);

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

  const handleBulkCreateStatements = () => {
    const selectedRows = getSelectedRows();
    if (!selectedRows) return;

    const items = selectedRows.map((row) => ({
      shopOrderId: row.shopOrderId,
      lineId: row.line.id,
    }));

    setPendingStatementItems(items);
    setStatementCreateDialogOpen(true);
  };

  const handleConfirmCreateStatements = async (statementDate: string) => {
    if (pendingStatementItems.length === 0) return;

    setStatementCreateDialogOpen(false);
    setBulkBusy(true);
    try {
      const result = await createShopOrderBulkStatements(pendingStatementItems, { statementDate });

      if (result.groups.length === 0) {
        alert('선택한 주문건에 명세서를 생성할 수 없습니다.');
        return;
      }

      await onReload();
      setSelectedRowKeys(new Set());

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
    navigate(shopOrderDetailPath(targetOrderId, listTab, listReturnPath));
  };

  const handleViewDetail = (shopOrderId: string) => {
    navigate(shopOrderDetailPath(shopOrderId, listTab, listReturnPath));
  };

  const requestLineChangeWithStatementCheck = (
    row: ShopOrderLineListRow,
    updates: Partial<Pick<ShopOrderLine, 'deliveryFee' | 'vatExempt'>>,
    performSave: () => Promise<void>
  ) => {
    const relatedStatements = collectRelatedStatementRefsForLineSync(row, lineRows, updates);
    if (relatedStatements.length === 0) {
      void performSave();
      return;
    }

    setStatementChangeNotice({
      statements: relatedStatements,
      onConfirm: performSave,
    });
  };

  const handleViewRelatedStatement = (statement: RelatedStatementRef) => {
    setStatementChangeNotice(null);
    navigate(
      buildShopStatementsFocusPath({
        tab: statement.isReservation ? 'reservations' : 'orders',
        groupKeys: [statement.groupKey],
        preview: true,
      })
    );
  };

  const handleToggleDeliveryFee = async (row: ShopOrderLineListRow, enabled: boolean) => {
    const nextDeliveryFee = enabled ? SHOP_ORDER_DEFAULT_DELIVERY_FEE : null;

    requestLineChangeWithStatementCheck(row, { deliveryFee: nextDeliveryFee }, async () => {
      setDeliveryFeeSavingRowKey(row.rowKey);
      try {
        const updated = await syncShopOrderDetail(row.shopOrderId, {
          lines: [
            {
              id: row.line.id,
              deliveryFee: nextDeliveryFee,
            },
          ],
        });
        onOrderPatched(updated);
      } catch (err) {
        alert(err instanceof Error ? err.message : '배송비 저장에 실패했습니다.');
      } finally {
        setDeliveryFeeSavingRowKey(null);
      }
    });
  };

  const handleToggleVatExempt = async (row: ShopOrderLineListRow, enabled: boolean) => {
    requestLineChangeWithStatementCheck(row, { vatExempt: enabled }, async () => {
      setVatExemptSavingRowKey(row.rowKey);
      try {
        const updated = await syncShopOrderDetail(row.shopOrderId, {
          lines: [
            {
              id: row.line.id,
              vatExempt: enabled,
            },
          ],
        });
        onOrderPatched(updated);
      } catch (err) {
        alert(err instanceof Error ? err.message : '부가세 없음 저장에 실패했습니다.');
      } finally {
        setVatExemptSavingRowKey(null);
      }
    });
  };

  const handleToggleShippingReady = async (row: ShopOrderLineListRow, enabled: boolean) => {
    if (lineHasTracking(row.line)) return;

    setShippingReadySavingRowKey(row.rowKey);
    try {
      const updated = await syncShopOrderDetail(row.shopOrderId, {
        lines: [
          {
            id: row.line.id,
            shippingReady: enabled,
          },
        ],
      });
      onOrderPatched(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : '출고준비 저장에 실패했습니다.');
    } finally {
      setShippingReadySavingRowKey(null);
    }
  };

  const handleRemoveLine = async (row: ShopOrderLineListRow) => {
    const orderRef = formatLineOrderRef(
      row.line.lineOrderNumber,
      row.orderNumber,
      row.lineIndex,
      orderRefPrefix
    );

    const policy = analyzeLineRemovalStatementPolicy(row.line, orders);

    if (policy.blocked) {
      alert(policy.blockReason ?? '제거할 수 없습니다.');
      return;
    }

    if (!window.confirm(buildRemoveLineConfirmMessage(row.line, orderRef, policy))) {
      return;
    }

    setRemovingLineRowKey(row.rowKey);
    try {
      const updated = await deleteShopOrderLine(row.shopOrderId, row.line.id);
      setSelectedRowKeys((prev) => {
        const next = new Set(prev);
        next.delete(row.rowKey);
        return next;
      });
      onOrderPatched(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : '주문 건 제거에 실패했습니다.');
    } finally {
      setRemovingLineRowKey(null);
    }
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

  const handleBuyerModalProductClick = useCallback(
    (shopOrderId: string) => {
      setBuyerModalOpen(false);
      setSelectedBuyer(null);
      setBuyerUnmatchedMessage(null);
      setBuyerOrderLineInfo(null);
      navigate(shopOrderDetailPath(shopOrderId, listTab, listReturnPath));
    },
    [listTab, listReturnPath, navigate]
  );

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
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            onClear={clearSearch}
            placeholder="주문번호, 상품명, 상호, 카톡, 수령인, 전화, 주소로 검색..."
            focusRingClass={accentRingClass}
          />
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
          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <select
              value={dateField}
              onChange={(e) => setDateField(e.target.value as typeof dateField)}
              className={`px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${accentRingClass} appearance-none bg-white text-sm`}
              title="날짜 필터 기준"
            >
              {SHOP_ORDER_LINE_DATE_FIELD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={`px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${accentRingClass} text-sm`}
              title="시작일"
            />
            <span className="text-gray-400">~</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={`px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${accentRingClass} text-sm`}
              title="종료일"
            />
            {dateFilterActive && (
              <button
                type="button"
                onClick={clearDateFilter}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 whitespace-nowrap"
              >
                날짜 초기화
              </button>
            )}
          </div>
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
            <button
              type="button"
              onClick={() => toggleSortByCompanyAddress()}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border transition-colors ${
                sortByCompanyAddress
                  ? accentFilterActiveClass
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              title={
                sortByCompanyAddress
                  ? '주문 순서별 정렬로 전환'
                  : '상호명·주소가 같은 업체끼리 묶어 정렬'
              }
            >
              <ArrowUpDown className="w-4 h-4" />
              업체별 정렬
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-500">
          {displayRows.length.toLocaleString()}건 표시
          {sortByCompanyAddress ? ' · 업체별 정렬' : ''}
          {fulfillmentFilterActive || dateFilterActive || statusFilter !== ALL_STATUS || searchTerm
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
            onClick={handleBulkCreateStatements}
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
                  {!isReservationTab && (
                    <th className="px-3 py-3 text-center text-gray-600 whitespace-nowrap">
                      배송비
                      <span className="block text-[10px] font-normal text-gray-400">
                        {SHOP_ORDER_DEFAULT_DELIVERY_FEE.toLocaleString()}원
                      </span>
                    </th>
                  )}
                  <th className="px-3 py-3 text-center text-gray-600 whitespace-nowrap">부가세없음</th>
                  <th className="px-3 py-3 text-center text-gray-600 whitespace-nowrap">출고준비</th>
                  <th className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">총계</th>
                  <th className="px-4 py-3 text-left text-gray-600 whitespace-nowrap">수령인</th>
                  <th className="px-4 py-3 text-left text-gray-600 whitespace-nowrap">배송</th>
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
                            {resolveCompanyNameDisplay(line.companyName, buyers)}
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-4 text-gray-600">{row.productName}</td>
                      <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                        {formatLineQuantity(line)}
                      </td>
                      {!isReservationTab && (
                        <td className="px-3 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <label
                            className={`inline-flex flex-col items-center gap-0.5 ${
                              deliveryFeeSavingRowKey === row.rowKey
                                ? 'cursor-wait opacity-60'
                                : 'cursor-pointer'
                            }`}
                            title={`택배비 ${SHOP_ORDER_DEFAULT_DELIVERY_FEE.toLocaleString()}원 추가`}
                          >
                            <input
                              type="checkbox"
                              checked={lineHasDefaultDeliveryFee(line.deliveryFee)}
                              disabled={deliveryFeeSavingRowKey === row.rowKey || bulkBusy}
                              onChange={(event) =>
                                void handleToggleDeliveryFee(row, event.target.checked)
                              }
                              className={checkboxClass}
                              aria-label={`${formatLineOrderRef(row.line.lineOrderNumber, row.orderNumber, row.lineIndex)} 배송비 추가`}
                            />
                            {deliveryFeeSavingRowKey === row.rowKey ? (
                              <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                            ) : lineHasDefaultDeliveryFee(line.deliveryFee) ? (
                              <span className="text-[10px] tabular-nums text-emerald-700">
                                ₩{SHOP_ORDER_DEFAULT_DELIVERY_FEE.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400">미적용</span>
                            )}
                          </label>
                        </td>
                      )}
                      <td className="px-3 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <label
                          className={`inline-flex flex-col items-center gap-0.5 ${
                            vatExemptSavingRowKey === row.rowKey
                              ? 'cursor-wait opacity-60'
                              : 'cursor-pointer'
                          }`}
                          title="부가세 없음 거래"
                        >
                          <input
                            type="checkbox"
                            checked={line.vatExempt}
                            disabled={vatExemptSavingRowKey === row.rowKey || bulkBusy}
                            onChange={(event) =>
                              void handleToggleVatExempt(row, event.target.checked)
                            }
                            className={checkboxClass}
                            aria-label={`${formatLineOrderRef(row.line.lineOrderNumber, row.orderNumber, row.lineIndex, orderRefPrefix)} 부가세 없음`}
                          />
                          {vatExemptSavingRowKey === row.rowKey ? (
                            <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                          ) : line.vatExempt ? (
                            <span className="text-[10px] text-purple-700">적용</span>
                          ) : (
                            <span className="text-[10px] text-gray-400">미적용</span>
                          )}
                        </label>
                      </td>
                      <td className="px-3 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {lineInPreShipmentPhase(line) ? (
                          <label
                            className={`inline-flex flex-col items-center gap-0.5 ${
                              shippingReadySavingRowKey === row.rowKey
                                ? 'cursor-wait opacity-60'
                                : 'cursor-pointer'
                            }`}
                            title="출고준비 완료"
                          >
                            <input
                              type="checkbox"
                              checked={line.shippingReady}
                              disabled={shippingReadySavingRowKey === row.rowKey || bulkBusy}
                              onChange={(event) =>
                                void handleToggleShippingReady(row, event.target.checked)
                              }
                              className={checkboxClass}
                              aria-label={`${formatLineOrderRef(row.line.lineOrderNumber, row.orderNumber, row.lineIndex, orderRefPrefix)} 출고준비`}
                            />
                            {shippingReadySavingRowKey === row.rowKey ? (
                              <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                            ) : line.shippingReady ? (
                              <span className="text-[10px] text-sky-700">완료</span>
                            ) : (
                              <span className="text-[10px] text-gray-400">대기</span>
                            )}
                          </label>
                        ) : (
                          <span className="text-[10px] text-gray-400" title="송장 등록됨">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-gray-900 font-medium text-right whitespace-nowrap">
                        {line.totalAmount != null && line.totalAmount > 0
                          ? `₩${line.totalAmount.toLocaleString()}`
                          : '-'}
                      </td>
                      <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                        {line.recipientName ?? '-'}
                      </td>
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <ShopLineDeliveryStatusLink
                          lineId={line.id}
                          lineShipmentMap={lineShipmentMap}
                          compact
                        />
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
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleViewDetail(row.shopOrderId)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="제품 상세 보기"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={
                              removingLineRowKey === row.rowKey ||
                              bulkBusy ||
                              removingLineRowKey != null
                            }
                            onClick={() => void handleRemoveLine(row)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="주문 건 제거"
                          >
                            {removingLineRowKey === row.rowKey ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
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
        companyOrderLineGroups={buyerModalOrderLineGroups}
        onProductClick={handleBuyerModalProductClick}
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

      <ShopOrderStatementCreateDialog
        isOpen={statementCreateDialogOpen}
        lineCount={pendingStatementItems.length}
        isReservation={isReservationTab}
        onConfirm={(statementDate) => void handleConfirmCreateStatements(statementDate)}
        onCancel={() => {
          setStatementCreateDialogOpen(false);
          setPendingStatementItems([]);
        }}
      />

      <ShopOrderStatementModal
        isOpen={statementModalOpen}
        groups={statementGroups}
        title="거래명세표 미리보기"
        onClose={() => setStatementModalOpen(false)}
      />

      <ShopOrderStatementChangeNoticeDialog
        isOpen={statementChangeNotice != null}
        statements={statementChangeNotice?.statements ?? []}
        onConfirm={() => {
          const pending = statementChangeNotice;
          if (!pending) return;
          void pending.onConfirm();
          setStatementChangeNotice(null);
        }}
        onCancel={() => setStatementChangeNotice(null)}
        onViewStatement={handleViewRelatedStatement}
      />
    </>
  );
}
