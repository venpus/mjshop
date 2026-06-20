import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Download, Eye, Loader2, Search, XCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  cancelShopOrderStatements,
  getShopOrderStatementGroupPreview,
  getShopOrders,
  updateShopOrderStatementDelivery,
  updateShopOrderStatementPayment,
  type ShopOrder,
} from '../../api/shopOrderApi';
import {
  downloadShopOrderStatementAsPng,
  downloadStatementPngsBulk,
  formatStatementBulkDownloadMessage,
  isDirectoryPickerAbortError,
  type StatementPngDownloadItem,
} from '../../utils/shopOrderStatementDownload';
import { useShopOrderListPagination } from '../../hooks/useShopOrderListPagination';
import {
  buildShopOrderStatementListRows,
  buildStatementGroupPreviewItems,
  groupShopOrderStatementRows,
  groupShopOrderStatementsByCompany,
  type ShopOrderLineListKind,
  type ShopOrderStatementCompanyGroup,
  type ShopOrderStatementGroupRow,
} from '../../utils/shopOrderListExport';
import { formatLineOrderRef } from '../../utils/shopOrderLineListUtils';
import {
  parseShopStatementFocusGroupKeys,
  SHOP_STATEMENTS_PATH,
} from '../../utils/shopStatementNavigation';
import { ShopOrderListPagination } from './ShopOrderListPagination';
import { ShopOrderStatementModal } from './ShopOrderStatementModal';

type StatementTabKind = Extract<ShopOrderLineListKind, 'orders' | 'reservations'>;

function formatStatementDate(value: string | null | undefined): string {
  if (!value) return '-';
  const datePart = value.includes('T') ? value.split('T')[0] : value.slice(0, 10);
  const date = new Date(datePart);
  if (Number.isNaN(date.getTime())) return datePart;
  return date.toLocaleDateString('ko-KR');
}

function buildGroupTitle(group: ShopOrderStatementGroupRow): string {
  const kindLabel = group.isReservation ? '예약' : '주문';
  const dateLabel = formatStatementDate(group.statementIssuedAt);
  if (group.lineCount > 1) {
    return `${group.companyName} · ${dateLabel} (${kindLabel} 통합 ${group.lineCount}건)`;
  }
  return `${group.companyName} · ${dateLabel} (${kindLabel})`;
}

function buildStatementGroups(
  orders: ShopOrder[],
  kind: StatementTabKind
): ShopOrderStatementGroupRow[] {
  const rows = buildShopOrderStatementListRows(orders, kind);
  return groupShopOrderStatementRows(rows).sort((a, b) => {
    const dateA = a.statementIssuedAt ?? a.latestUpdatedAt;
    const dateB = b.statementIssuedAt ?? b.latestUpdatedAt;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });
}

function filterStatements(
  statements: ShopOrderStatementGroupRow[],
  searchTerm: string,
  onlyUndelivered: boolean
): ShopOrderStatementGroupRow[] {
  let result = statements;
  if (onlyUndelivered) {
    result = result.filter((group) => !group.statementDelivered);
  }

  const lower = searchTerm.trim().toLowerCase();
  if (!lower) return result;

  return result.filter((group) => {
    return (
      group.companyName.toLowerCase().includes(lower) ||
      group.address.toLowerCase().includes(lower) ||
      group.recipientName.toLowerCase().includes(lower) ||
      group.orderRefsLabel.toLowerCase().includes(lower) ||
      group.productNamesLabel.toLowerCase().includes(lower) ||
      String(group.totalBoxCount).includes(lower) ||
      formatStatementDate(group.statementIssuedAt).includes(lower) ||
      group.lines.some(
        (row) =>
          row.productName.toLowerCase().includes(lower) ||
          row.orderNumber.toLowerCase().includes(lower)
      )
    );
  });
}

export function ShopStatementsPage() {
  const [searchParams] = useSearchParams();
  const focusGroupKeys = useMemo(
    () => parseShopStatementFocusGroupKeys(searchParams.get('g')),
    [searchParams]
  );
  const focusFilterActive = focusGroupKeys != null && focusGroupKeys.size > 0;
  const autoPreviewRequested = searchParams.get('preview') === '1';
  const autoPreviewDoneRef = useRef(false);

  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StatementTabKind>(() =>
    searchParams.get('tab') === 'reservations' ? 'reservations' : 'orders'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyUndelivered, setOnlyUndelivered] = useState(false);
  const [busyGroupKey, setBusyGroupKey] = useState<string | null>(null);
  const [deliverySavingGroupKey, setDeliverySavingGroupKey] = useState<string | null>(null);
  const [paymentSavingGroupKey, setPaymentSavingGroupKey] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [selectedGroupKeys, setSelectedGroupKeys] = useState<Set<string>>(new Set());
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number } | null>(
    null
  );
  const [statementModalOpen, setStatementModalOpen] = useState(false);
  const [statementModalTitle, setStatementModalTitle] = useState('거래명세표');
  const [statementHtml, setStatementHtml] = useState('');
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(new Set());

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getShopOrders();
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '명세서 목록을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'reservations') {
      setActiveTab('reservations');
    } else if (tabParam === 'orders') {
      setActiveTab('orders');
    }
  }, [searchParams]);

  useEffect(() => {
    autoPreviewDoneRef.current = false;
  }, [searchParams]);

  const orderStatementGroups = useMemo(
    () => buildStatementGroups(orders, 'orders'),
    [orders]
  );
  const reservationStatementGroups = useMemo(
    () => buildStatementGroups(orders, 'reservations'),
    [orders]
  );

  const orderStatementLineCount = useMemo(
    () => buildShopOrderStatementListRows(orders, 'orders').length,
    [orders]
  );
  const reservationStatementLineCount = useMemo(
    () => buildShopOrderStatementListRows(orders, 'reservations').length,
    [orders]
  );

  const isReservationTab = activeTab === 'reservations';
  const statementGroups = isReservationTab ? reservationStatementGroups : orderStatementGroups;
  const statementLineCount = isReservationTab
    ? reservationStatementLineCount
    : orderStatementLineCount;

  const tabCancelItems = useMemo(
    () =>
      buildShopOrderStatementListRows(orders, activeTab).map((row) => ({
        shopOrderId: row.shopOrderId,
        lineId: row.line.id,
      })),
    [orders, activeTab]
  );

  const undeliveredStatementCount = useMemo(
    () => statementGroups.filter((group) => !group.statementDelivered).length,
    [statementGroups]
  );

  const filteredStatements = useMemo(() => {
    let result = filterStatements(statementGroups, searchTerm, onlyUndelivered);
    if (focusGroupKeys && focusGroupKeys.size > 0) {
      result = result.filter((group) => focusGroupKeys.has(group.groupKey));
    }
    return result;
  }, [searchTerm, statementGroups, onlyUndelivered, focusGroupKeys]);

  const filteredCompanyGroups = useMemo(
    () => groupShopOrderStatementsByCompany(filteredStatements),
    [filteredStatements]
  );

  const {
    paginatedItems: paginatedCompanyGroups,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
  } = useShopOrderListPagination(
    filteredCompanyGroups,
    `${activeTab}|${searchTerm}|${onlyUndelivered ? 'undelivered' : 'all'}`
  );

  const flatStatements = useMemo(
    () => filteredCompanyGroups.flatMap((company) => company.statements),
    [filteredCompanyGroups]
  );

  useEffect(() => {
    setSelectedGroupKeys(new Set());
    if (!focusFilterActive) {
      setExpandedGroupKeys(new Set());
    }
    setOnlyUndelivered(false);
    setCurrentPage(1);
  }, [activeTab, focusFilterActive, setCurrentPage]);

  useEffect(() => {
    if (!focusGroupKeys || focusGroupKeys.size === 0) return;
    setExpandedGroupKeys(new Set(focusGroupKeys));
  }, [focusGroupKeys]);

  const selectedGroups = useMemo(
    () => statementGroups.filter((group) => selectedGroupKeys.has(group.groupKey)),
    [statementGroups, selectedGroupKeys]
  );

  const paginatedStatementKeys = useMemo(
    () =>
      paginatedCompanyGroups.flatMap((company) =>
        company.statements.map((statement) => statement.groupKey)
      ),
    [paginatedCompanyGroups]
  );

  const filteredStatementKeys = useMemo(
    () => flatStatements.map((statement) => statement.groupKey),
    [flatStatements]
  );

  const allFilteredSelected =
    filteredStatementKeys.length > 0 &&
    filteredStatementKeys.every((key) => selectedGroupKeys.has(key));

  const someFilteredSelected =
    filteredStatementKeys.some((key) => selectedGroupKeys.has(key)) && !allFilteredSelected;

  const companyHeaderClass = isReservationTab
    ? 'bg-amber-50 border-amber-200 text-amber-950'
    : 'bg-emerald-50 border-emerald-200 text-emerald-950';

  const allPageSelected =
    paginatedStatementKeys.length > 0 &&
    paginatedStatementKeys.every((key) => selectedGroupKeys.has(key));

  const somePageSelected =
    paginatedStatementKeys.some((key) => selectedGroupKeys.has(key)) && !allPageSelected;

  const accentFilterActiveClass = isReservationTab
    ? 'bg-amber-600 text-white border-amber-600'
    : 'bg-emerald-600 text-white border-emerald-600';
  const accentCheckboxClass = isReservationTab ? 'accent-amber-600' : 'accent-emerald-600';
  const accentButtonClass = isReservationTab
    ? 'border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100'
    : 'border-emerald-200 text-emerald-800 bg-emerald-50 hover:bg-emerald-100';
  const accentBulkDownloadClass = isReservationTab
    ? 'border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100'
    : 'border-emerald-200 text-emerald-800 bg-emerald-50 hover:bg-emerald-100';
  const cardBorderClass = isReservationTab ? 'hover:border-amber-300' : 'hover:border-emerald-300';
  const includedColumnLabel = isReservationTab ? '예약' : '주문';

  const toggleExpanded = (groupKey: string) => {
    setExpandedGroupKeys((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  const buildDownloadItems = async (
    groups: ShopOrderStatementGroupRow[]
  ): Promise<StatementPngDownloadItem[]> => {
    const items: StatementPngDownloadItem[] = [];

    for (const group of groups) {
      const preview = await getShopOrderStatementGroupPreview(
        buildStatementGroupPreviewItems(group)
      );
      items.push({
        html: preview.html,
        issuedAt: group.statementIssuedAt ?? group.latestUpdatedAt,
        companyName: group.companyName,
        lineCount: group.lineCount,
        isReservation: group.isReservation,
      });
    }

    return items;
  };

  const downloadGroupsBulk = async (
    groups: ShopOrderStatementGroupRow[]
  ): Promise<{ saved: number; delivery: 'folder' | 'zip' }> => {
    const items = await buildDownloadItems(groups);
    setDownloadProgress({ current: 0, total: items.length });

    const result = await downloadStatementPngsBulk(items, (current, total) => {
      setDownloadProgress({ current, total });
    });

    return result;
  };

  const handleToggleSelectAll = () => {
    setSelectedGroupKeys((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        paginatedStatementKeys.forEach((key) => next.delete(key));
      } else {
        paginatedStatementKeys.forEach((key) => next.add(key));
      }
      return next;
    });
  };

  const handleToggleSelectAllFiltered = () => {
    setSelectedGroupKeys((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredStatementKeys.forEach((key) => next.delete(key));
      } else {
        filteredStatementKeys.forEach((key) => next.add(key));
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedGroupKeys(new Set());
  };

  const handleToggleSelect = (groupKey: string) => {
    setSelectedGroupKeys((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  const handleDownloadAllStatements = async () => {
    if (statementGroups.length === 0) {
      alert('다운로드할 명세서가 없습니다.');
      return;
    }

    setIsBulkDownloading(true);
    try {
      const result = await downloadGroupsBulk(statementGroups);
      alert(formatStatementBulkDownloadMessage(result.saved, result.delivery));
    } catch (err) {
      if (isDirectoryPickerAbortError(err)) return;
      alert(err instanceof Error ? err.message : '명세서 다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsBulkDownloading(false);
      setDownloadProgress(null);
    }
  };

  const handleDownloadSelectedStatements = async () => {
    if (selectedGroups.length === 0) {
      alert('다운로드할 명세서를 선택해 주세요.');
      return;
    }

    if (selectedGroups.length === 1) {
      await handleDownloadStatement(selectedGroups[0]);
      return;
    }

    setIsBulkDownloading(true);
    try {
      const result = await downloadGroupsBulk(selectedGroups);
      alert(formatStatementBulkDownloadMessage(result.saved, result.delivery));
    } catch (err) {
      if (isDirectoryPickerAbortError(err)) return;
      alert(err instanceof Error ? err.message : '명세서 다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsBulkDownloading(false);
      setDownloadProgress(null);
    }
  };

  const handleViewStatement = async (group: ShopOrderStatementGroupRow) => {
    setBusyGroupKey(group.groupKey);
    try {
      const preview = await getShopOrderStatementGroupPreview(
        buildStatementGroupPreviewItems(group)
      );
      setStatementModalTitle(buildGroupTitle(group));
      setStatementHtml(preview.html);
      setStatementModalOpen(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : '명세서 보기 중 오류가 발생했습니다.');
    } finally {
      setBusyGroupKey(null);
    }
  };

  useEffect(() => {
    if (isLoading || autoPreviewDoneRef.current || !autoPreviewRequested) return;
    if (filteredStatements.length !== 1) return;
    autoPreviewDoneRef.current = true;
    void handleViewStatement(filteredStatements[0]);
  }, [isLoading, autoPreviewRequested, filteredStatements]);

  const handleDownloadStatement = async (group: ShopOrderStatementGroupRow) => {
    setBusyGroupKey(group.groupKey);
    try {
      const preview = await getShopOrderStatementGroupPreview(
        buildStatementGroupPreviewItems(group)
      );
      await downloadShopOrderStatementAsPng(
        preview.html,
        group.statementIssuedAt ?? group.latestUpdatedAt,
        group.companyName,
        group.lineCount,
        group.isReservation
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : '명세서 다운로드 중 오류가 발생했습니다.');
    } finally {
      setBusyGroupKey(null);
    }
  };

  const handleCancelStatement = async (group: ShopOrderStatementGroupRow) => {
    const kindLabel = group.isReservation ? '예약' : '주문';
    const message =
      group.lineCount > 1
        ? `「${group.companyName}」 ${formatStatementDate(group.statementIssuedAt)} ${kindLabel} 통합 명세서(${group.lineCount}건)를 취소하시겠습니까?`
        : `「${group.companyName}」 ${formatStatementDate(group.statementIssuedAt)} ${kindLabel} 명세서를 취소하시겠습니까?`;

    if (!window.confirm(message)) return;

    setBusyGroupKey(group.groupKey);
    try {
      const result = await cancelShopOrderStatements(
        group.lines.map((row) => ({
          shopOrderId: row.shopOrderId,
          lineId: row.line.id,
        }))
      );
      await loadOrders();
      alert(`${result.cancelledCount.toLocaleString()}건의 명세서를 취소했습니다.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : '명세서 취소 중 오류가 발생했습니다.');
    } finally {
      setBusyGroupKey(null);
    }
  };

  const handleCancelAllStatements = async () => {
    if (tabCancelItems.length === 0) {
      alert('삭제할 명세서가 없습니다.');
      return;
    }

    const kindLabel = isReservationTab ? '예약' : '주문';
    const message =
      `발행된 ${kindLabel} 명세서 ${statementGroups.length.toLocaleString()}장` +
      `(${kindLabel}건 ${statementLineCount.toLocaleString()}건)을 모두 삭제하시겠습니까?\n` +
      `모든 ${kindLabel}건에서 명세서 발행이 해제됩니다.`;

    if (!window.confirm(message)) return;

    setIsDeletingAll(true);
    try {
      const result = await cancelShopOrderStatements(tabCancelItems);
      await loadOrders();
      alert(`${result.cancelledCount.toLocaleString()}건의 명세서를 삭제했습니다.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : '명세서 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const patchOrdersStatementDelivered = (
    items: Array<{ shopOrderId: string; lineId: string }>,
    delivered: boolean
  ) => {
    const keySet = new Set(items.map((item) => `${item.shopOrderId}:${item.lineId}`));
    setOrders((prev) =>
      prev.map((order) => ({
        ...order,
        lines: order.lines.map((line) =>
          keySet.has(`${order.id}:${line.id}`)
            ? { ...line, statementDelivered: delivered }
            : line
        ),
      }))
    );
  };

  const patchOrdersPaymentReceived = (
    items: Array<{ shopOrderId: string; lineId: string }>,
    paymentReceived: boolean
  ) => {
    const keySet = new Set(items.map((item) => `${item.shopOrderId}:${item.lineId}`));
    setOrders((prev) =>
      prev.map((order) => ({
        ...order,
        lines: order.lines.map((line) =>
          keySet.has(`${order.id}:${line.id}`)
            ? { ...line, paymentReceived }
            : line
        ),
      }))
    );
  };

  const handleToggleStatementDelivered = async (
    statement: ShopOrderStatementGroupRow,
    delivered: boolean
  ) => {
    const items = buildStatementGroupPreviewItems(statement);
    const previousDelivered = statement.statementDelivered;
    patchOrdersStatementDelivered(items, delivered);
    setDeliverySavingGroupKey(statement.groupKey);

    try {
      await updateShopOrderStatementDelivery(items, delivered);
    } catch (err) {
      patchOrdersStatementDelivered(items, previousDelivered);
      alert(err instanceof Error ? err.message : '명세서 전달완료 저장에 실패했습니다.');
    } finally {
      setDeliverySavingGroupKey(null);
    }
  };

  const handleTogglePaymentReceived = async (
    statement: ShopOrderStatementGroupRow,
    paymentReceived: boolean
  ) => {
    const items = buildStatementGroupPreviewItems(statement);
    const previousByLineId = new Map(
      statement.lines.map((row) => [row.line.id, row.line.paymentReceived] as const)
    );
    patchOrdersPaymentReceived(items, paymentReceived);
    setPaymentSavingGroupKey(statement.groupKey);

    try {
      await updateShopOrderStatementPayment(items, paymentReceived);
    } catch (err) {
      const keySet = new Set(items.map((item) => `${item.shopOrderId}:${item.lineId}`));
      setOrders((prev) =>
        prev.map((order) => ({
          ...order,
          lines: order.lines.map((line) => {
            if (!keySet.has(`${order.id}:${line.id}`)) return line;
            const previous = previousByLineId.get(line.id);
            return previous !== undefined ? { ...line, paymentReceived: previous } : line;
          }),
        }))
      );
      alert(err instanceof Error ? err.message : '명세서 입금완료 저장에 실패했습니다.');
    } finally {
      setPaymentSavingGroupKey(null);
    }
  };

  const renderStatementCard = (statement: ShopOrderStatementGroupRow) => {
    const isBusy =
      busyGroupKey === statement.groupKey ||
      isDeletingAll ||
      isBulkDownloading ||
      deliverySavingGroupKey === statement.groupKey ||
      paymentSavingGroupKey === statement.groupKey;
    const isSelected = selectedGroupKeys.has(statement.groupKey);
    const isExpanded = expandedGroupKeys.has(statement.groupKey);
    const isSavingDelivery = deliverySavingGroupKey === statement.groupKey;
    const isSavingPayment = paymentSavingGroupKey === statement.groupKey;

    return (
      <article
        key={statement.groupKey}
        className={`flex flex-col rounded-md border bg-white transition-colors ${
          statement.statementDelivered
            ? 'border-gray-300 bg-gray-50/80'
            : isSelected
              ? 'border-purple-400 ring-1 ring-purple-200'
              : 'border-gray-200'
        } ${cardBorderClass}`}
      >
        <div className="px-2 pt-2 pb-1 flex items-start gap-1.5">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => handleToggleSelect(statement.groupKey)}
            disabled={isBulkDownloading || isDeletingAll}
            className={`mt-0.5 w-3.5 h-3.5 shrink-0 cursor-pointer ${accentCheckboxClass}`}
            aria-label={`${statement.companyName} 명세서 선택`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <p className="text-xs font-semibold text-gray-900">
                {formatStatementDate(statement.statementIssuedAt)}
              </p>
              <p className="text-xs font-semibold text-gray-900 tabular-nums shrink-0">
                {statement.totalAmount > 0 ? `₩${statement.totalAmount.toLocaleString()}` : '-'}
              </p>
            </div>
            <p
              className="text-[11px] text-gray-700 line-clamp-2 mt-0.5 leading-snug"
              title={statement.productNamesLabel}
            >
              {statement.productNamesLabel}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              박스 {statement.totalBoxCount.toLocaleString()}개
              {statement.lineCount > 1 ? ` · ${includedColumnLabel} ${statement.lineCount}건` : ''}
            </p>
          </div>
        </div>

        {isExpanded && (
          <div className="px-2 pb-1 border-t border-gray-100 pt-1">
            <ul className="space-y-0.5 max-h-24 overflow-y-auto text-[10px]">
              {statement.lines.map((row) => (
                <li key={row.rowKey} className="flex items-baseline justify-between gap-1 text-gray-700">
                  <span className="font-mono text-gray-800 shrink-0">
                    {formatLineOrderRef(
                      row.line.lineOrderNumber,
                      row.orderNumber,
                      row.lineIndex,
                      row.line.isReservation ? '예약' : undefined
                    )}
                  </span>
                  <span className="truncate flex-1 text-gray-500">{row.productName}</span>
                  <span className="tabular-nums shrink-0 text-gray-600">
                    {row.line.orderBoxCount}박스
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-1 px-2 py-1 border-t border-gray-100 bg-gray-50/60 rounded-b-md">
          <div className="flex items-center gap-2 min-w-0">
            <label
              className={`inline-flex items-center gap-1 text-[10px] cursor-pointer select-none shrink-0 ${
                statement.statementDelivered ? 'text-emerald-700 font-medium' : 'text-gray-600'
              }`}
            >
              <input
                type="checkbox"
                checked={statement.statementDelivered}
                disabled={isBusy}
                onChange={(event) =>
                  void handleToggleStatementDelivered(statement, event.target.checked)
                }
                className={`w-3 h-3 cursor-pointer ${accentCheckboxClass}`}
              />
              {isSavingDelivery ? '저장…' : '전달완료'}
            </label>
            <label
              className={`inline-flex items-center gap-1 text-[10px] cursor-pointer select-none shrink-0 ${
                statement.paymentReceived ? 'text-emerald-700 font-medium' : 'text-gray-600'
              }`}
            >
              <input
                type="checkbox"
                checked={statement.paymentReceived}
                disabled={isBusy}
                onChange={(event) =>
                  void handleTogglePaymentReceived(statement, event.target.checked)
                }
                className={`w-3 h-3 cursor-pointer ${accentCheckboxClass}`}
              />
              {isSavingPayment ? '저장…' : '입금완료'}
            </label>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => toggleExpanded(statement.groupKey)}
              className="inline-flex items-center p-1 text-gray-500 hover:text-gray-800 rounded"
              title={isExpanded ? '접기' : '상세 보기'}
            >
              <ChevronDown
                className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              />
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleViewStatement(statement)}
              title="보기"
              className={`p-1 rounded border disabled:opacity-50 ${accentButtonClass}`}
            >
              {busyGroupKey === statement.groupKey ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Eye className="w-3 h-3" />
              )}
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleDownloadStatement(statement)}
              title="다운로드"
              className="p-1 rounded border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <Download className="w-3 h-3" />
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleCancelStatement(statement)}
              title="명세서 취소"
              className="p-1 rounded border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50"
            >
              {busyGroupKey === statement.groupKey ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <XCircle className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>
      </article>
    );
  };

  const renderCompanyRow = (company: ShopOrderStatementCompanyGroup) => (
    <section
      key={company.companyKey}
      className="rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm"
    >
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 border-b ${companyHeaderClass}`}>
        <h3 className="text-xs font-bold">{company.companyName}</h3>
        <span className="text-[11px] font-normal opacity-80">
          명세서 {company.statementCount}장 · {includedColumnLabel}{' '}
          {company.lineCount.toLocaleString()}건
        </span>
      </div>
      <div className="p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 bg-gray-50/40">
        {company.statements.map((statement) => renderStatementCard(statement))}
      </div>
    </section>
  );

  return (
    <div className="p-8 min-h-[1080px]">
      <div className="mb-8">
        <h2 className="text-gray-900 mb-2">명세서 모아보기</h2>
        <p className="text-gray-600">
          상호명별로 묶어 보여 주며, 작성 시점이 다른 명세서는 같은 상호라도 각각 구분됩니다.
          명세서 작성 시 설정한 거래일자가 표시·다운로드에 반영됩니다.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2.5 text-sm font-medium transition-all rounded-t-lg border-b-2 -mb-px ${
            activeTab === 'orders'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-emerald-50 text-emerald-700 border-transparent hover:bg-emerald-100'
          }`}
        >
          주문 명세서
          <span className="ml-1.5 opacity-80">({orderStatementGroups.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reservations')}
          className={`px-4 py-2.5 text-sm font-medium transition-all rounded-t-lg border-b-2 -mb-px ${
            activeTab === 'reservations'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-amber-50 text-amber-800 border-transparent hover:bg-amber-100'
          }`}
        >
          예약 명세서
          <span className="ml-1.5 opacity-80">({reservationStatementGroups.length})</span>
        </button>
      </div>

      {focusFilterActive && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-950">
          <span>
            관련 명세서 <strong>{filteredStatements.length.toLocaleString()}장</strong>만 표시 중입니다.
          </span>
          <Link
            to={SHOP_STATEMENTS_PATH}
            className="inline-flex items-center gap-1 font-medium text-purple-800 hover:text-purple-950 hover:underline"
          >
            전체 명세서 보기
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6 text-sm">
        <span className="text-gray-600">
          {isReservationTab ? '예약' : '주문'} 명세서{' '}
          <strong className="text-gray-900">{statementGroups.length.toLocaleString()}장</strong>
        </span>
        <span className="text-gray-600">
          포함 {isReservationTab ? '예약' : '주문'}건{' '}
          <strong className="text-gray-900">{statementLineCount.toLocaleString()}건</strong>
        </span>
        <span className="text-gray-600">
          상호{' '}
          <strong className="text-gray-900">{filteredCompanyGroups.length.toLocaleString()}곳</strong>
        </span>
        <span className="text-gray-600">
          검색 명세서{' '}
          <strong className="text-gray-900">{flatStatements.length.toLocaleString()}장</strong>
        </span>
        <span className="text-gray-600">
          미전달{' '}
          <strong className={undeliveredStatementCount > 0 ? 'text-amber-700' : 'text-gray-900'}>
            {undeliveredStatementCount.toLocaleString()}장
          </strong>
        </span>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-200 bg-gray-50/80">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="상호명, 상품명, 박스수, 주문번호, 거래일자 검색"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setOnlyUndelivered((prev) => !prev)}
            className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
              onlyUndelivered
                ? accentFilterActiveClass
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            미전달만
            {undeliveredStatementCount > 0 && (
              <span className="ml-1 opacity-80">({undeliveredStatementCount.toLocaleString()})</span>
            )}
          </button>
          <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              ref={(el) => {
                if (el) el.indeterminate = someFilteredSelected;
              }}
              onChange={handleToggleSelectAllFiltered}
              disabled={isBulkDownloading || isDeletingAll || filteredStatementKeys.length === 0}
              className={`w-4 h-4 cursor-pointer ${accentCheckboxClass}`}
            />
            전체 선택
            {filteredStatementKeys.length > 0 && (
              <span className="text-gray-400">({filteredStatementKeys.length.toLocaleString()}장)</span>
            )}
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={allPageSelected}
              ref={(el) => {
                if (el) el.indeterminate = somePageSelected;
              }}
              onChange={handleToggleSelectAll}
              disabled={isBulkDownloading || isDeletingAll || paginatedStatementKeys.length === 0}
              className={`w-4 h-4 cursor-pointer ${accentCheckboxClass}`}
            />
            현재 페이지
          </label>
          <button
            type="button"
            onClick={() => void loadOrders()}
            disabled={isLoading || isDeletingAll || isBulkDownloading}
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-white disabled:opacity-50"
          >
            새로고침
          </button>
          {selectedGroupKeys.size > 0 && (
            <>
              <span className="text-sm text-gray-600">
                선택 {selectedGroupKeys.size.toLocaleString()}장
              </span>
              <button
                type="button"
                onClick={handleClearSelection}
                disabled={isBulkDownloading || isDeletingAll}
                className="px-2 py-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                선택 해제
              </button>
            </>
          )}
          {downloadProgress && (
            <span className="text-sm text-purple-700">
              저장 중 {downloadProgress.current}/{downloadProgress.total}
            </span>
          )}
          <button
            type="button"
            onClick={() => void handleDownloadSelectedStatements()}
            disabled={
              isLoading ||
              isDeletingAll ||
              isBulkDownloading ||
              selectedGroupKeys.size === 0 ||
              busyGroupKey != null
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            {isBulkDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            선택 다운로드
          </button>
          <button
            type="button"
            onClick={() => void handleDownloadAllStatements()}
            disabled={
              isLoading ||
              isDeletingAll ||
              isBulkDownloading ||
              statementGroups.length === 0 ||
              busyGroupKey != null
            }
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border disabled:opacity-50 ${accentBulkDownloadClass}`}
          >
            {isBulkDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            모두 다운로드
          </button>
          <button
            type="button"
            onClick={() => void handleCancelAllStatements()}
            disabled={
              isLoading ||
              isDeletingAll ||
              isBulkDownloading ||
              statementGroups.length === 0 ||
              busyGroupKey != null
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50"
          >
            {isDeletingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            {isReservationTab ? '예약' : '주문'} 명세서 모두 삭제
          </button>
        </div>

        {isLoading ? (
          <div className="py-16 flex flex-col items-center text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p>명세서 목록을 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-red-600">{error}</div>
        ) : filteredCompanyGroups.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            {statementGroups.length === 0
              ? `발행된 ${isReservationTab ? '예약' : '주문'} 명세서가 없습니다. 주문 관리에서 명세서를 생성해 주세요.`
              : onlyUndelivered
                ? '전달되지 않은 명세서가 없습니다.'
                : '검색 결과가 없습니다.'}
          </div>
        ) : (
          <>
            <ShopOrderListPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={setCurrentPage}
              className="border-t-0 border-b border-gray-200 bg-gray-50/50"
            />
            <div className="p-4 space-y-4">
              {paginatedCompanyGroups.map((company) => renderCompanyRow(company))}
            </div>
            <ShopOrderListPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={setCurrentPage}
              className="border-t border-gray-200 bg-gray-50/50"
            />
          </>
        )}
      </div>

      <ShopOrderStatementModal
        isOpen={statementModalOpen}
        html={statementHtml}
        title={statementModalTitle}
        onClose={() => setStatementModalOpen(false)}
      />
    </div>
  );
}
