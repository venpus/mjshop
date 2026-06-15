import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Eye, Loader2, Search, XCircle } from 'lucide-react';
import {
  cancelShopOrderStatements,
  getShopOrderStatementGroupPreview,
  getShopOrders,
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
  type ShopOrderLineListKind,
  type ShopOrderStatementGroupRow,
} from '../../utils/shopOrderListExport';
import { ShopOrderListPagination } from './ShopOrderListPagination';
import { ShopOrderStatementModal } from './ShopOrderStatementModal';

type StatementTabKind = Extract<ShopOrderLineListKind, 'orders' | 'reservations'>;

function formatStatementDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString('ko-KR');
}

function buildGroupTitle(group: ShopOrderStatementGroupRow): string {
  const kindLabel = group.isReservation ? '예약' : '주문';
  if (group.lineCount > 1) {
    return `${group.companyName} (${kindLabel} 통합 ${group.lineCount}건)`;
  }
  return `${group.companyName} (${kindLabel})`;
}

function buildStatementGroups(
  orders: ShopOrder[],
  kind: StatementTabKind
): ShopOrderStatementGroupRow[] {
  const rows = buildShopOrderStatementListRows(orders, kind);
  return groupShopOrderStatementRows(rows).sort(
    (a, b) => new Date(b.latestUpdatedAt).getTime() - new Date(a.latestUpdatedAt).getTime()
  );
}

export function ShopStatementsPage() {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StatementTabKind>('orders');
  const [searchTerm, setSearchTerm] = useState('');
  const [busyGroupKey, setBusyGroupKey] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [selectedGroupKeys, setSelectedGroupKeys] = useState<Set<string>>(new Set());
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number } | null>(
    null
  );
  const [statementModalOpen, setStatementModalOpen] = useState(false);
  const [statementModalTitle, setStatementModalTitle] = useState('거래명세표');
  const [statementHtml, setStatementHtml] = useState('');

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

  const filteredGroups = useMemo(() => {
    const lower = searchTerm.trim().toLowerCase();
    if (!lower) return statementGroups;

    return statementGroups.filter((group) => {
      return (
        group.companyName.toLowerCase().includes(lower) ||
        group.address.toLowerCase().includes(lower) ||
        group.recipientName.toLowerCase().includes(lower) ||
        group.orderRefsLabel.toLowerCase().includes(lower) ||
        group.lines.some((row) => row.productName.toLowerCase().includes(lower))
      );
    });
  }, [searchTerm, statementGroups]);

  const {
    paginatedItems: paginatedGroups,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
  } = useShopOrderListPagination(filteredGroups, searchTerm);

  useEffect(() => {
    setSelectedGroupKeys(new Set());
    setCurrentPage(1);
  }, [activeTab, setCurrentPage]);

  const selectedGroups = useMemo(
    () => statementGroups.filter((group) => selectedGroupKeys.has(group.groupKey)),
    [statementGroups, selectedGroupKeys]
  );

  const allPageSelected =
    paginatedGroups.length > 0 &&
    paginatedGroups.every((group) => selectedGroupKeys.has(group.groupKey));

  const accentCheckboxClass = isReservationTab ? 'accent-amber-600' : 'accent-emerald-600';
  const accentButtonClass = isReservationTab
    ? 'border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100'
    : 'border-emerald-200 text-emerald-800 bg-emerald-50 hover:bg-emerald-100';
  const accentBulkDownloadClass = isReservationTab
    ? 'border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100'
    : 'border-emerald-200 text-emerald-800 bg-emerald-50 hover:bg-emerald-100';
  const includedColumnLabel = isReservationTab ? '포함 예약' : '포함 주문';

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
        issuedAt: group.latestUpdatedAt,
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
        paginatedGroups.forEach((group) => next.delete(group.groupKey));
      } else {
        paginatedGroups.forEach((group) => next.add(group.groupKey));
      }
      return next;
    });
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

  const handleDownloadStatement = async (group: ShopOrderStatementGroupRow) => {
    setBusyGroupKey(group.groupKey);
    try {
      const preview = await getShopOrderStatementGroupPreview(
        buildStatementGroupPreviewItems(group)
      );
      await downloadShopOrderStatementAsPng(
        preview.html,
        group.latestUpdatedAt,
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
        ? `「${group.companyName}」 ${kindLabel} 통합 명세서(${group.lineCount}건)를 취소하시겠습니까?\n포함된 모든 ${kindLabel}건에서 명세서 발행이 해제됩니다.`
        : `「${group.companyName}」 ${kindLabel} 명세서를 취소하시겠습니까?`;

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

  return (
    <div className="p-8 min-h-[1080px]">
      <div className="mb-8">
        <h2 className="text-gray-900 mb-2">명세서 모아보기</h2>
        <p className="text-gray-600">
          주문건과 예약건 명세서를 각각 따로 모아 보여줍니다. 같은 상호·주소·수령인 내에서는
          주문끼리·예약끼리만 통합됩니다. 미리보기·PNG 다운로드는 해당 유형의 건만 포함합니다.
          여러 장은 폴더에 저장하거나(HTTPS·localhost), ZIP 파일로 받을 수 있습니다.
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <p className="text-gray-600 mb-1">{isReservationTab ? '예약' : '주문'} 명세서 (묶음)</p>
          <p className="text-gray-900">{statementGroups.length.toLocaleString()}장</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <p className="text-gray-600 mb-1">포함 {isReservationTab ? '예약' : '주문'}건</p>
          <p className="text-gray-900">{statementLineCount.toLocaleString()}건</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <p className="text-gray-600 mb-1">검색 결과</p>
          <p className="text-gray-900">{filteredGroups.length.toLocaleString()}장</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-200 bg-gray-50/80">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="상호명, 주소, 수령인, 주문번호, 상품명 검색"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button
            type="button"
            onClick={() => void loadOrders()}
            disabled={isLoading || isDeletingAll || isBulkDownloading}
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-white disabled:opacity-50"
          >
            새로고침
          </button>
          {selectedGroupKeys.size > 0 && (
            <span className="text-sm text-gray-600">선택 {selectedGroupKeys.size}장</span>
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
        ) : filteredGroups.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            {statementGroups.length === 0
              ? `발행된 ${isReservationTab ? '예약' : '주문'} 명세서가 없습니다. 주문 관리에서 명세서를 생성해 주세요.`
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-center w-10">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={handleToggleSelectAll}
                        disabled={isBulkDownloading || isDeletingAll}
                        className={`w-4 h-4 cursor-pointer ${accentCheckboxClass}`}
                        aria-label="현재 페이지 전체 선택"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-gray-600 whitespace-nowrap">상호명</th>
                    <th className="px-4 py-3 text-left text-gray-600 whitespace-nowrap">주소</th>
                    <th className="px-4 py-3 text-left text-gray-600 whitespace-nowrap">수령인</th>
                    <th className="px-4 py-3 text-left text-gray-600 whitespace-nowrap">
                      {includedColumnLabel}
                    </th>
                    <th className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">
                      합계(VAT포함)
                    </th>
                    <th className="px-4 py-3 text-left text-gray-600 whitespace-nowrap">
                      최근 발행일
                    </th>
                    <th className="px-4 py-3 text-left text-gray-600 whitespace-nowrap">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedGroups.map((group) => {
                    const isBusy =
                      busyGroupKey === group.groupKey || isDeletingAll || isBulkDownloading;
                    const isSelected = selectedGroupKeys.has(group.groupKey);
                    const badgeClass = group.isReservation
                      ? 'text-amber-800 bg-amber-50'
                      : 'text-emerald-800 bg-emerald-50';

                    return (
                      <tr key={group.groupKey} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(group.groupKey)}
                            disabled={isBulkDownloading || isDeletingAll}
                            className={`w-4 h-4 cursor-pointer ${accentCheckboxClass}`}
                            aria-label={`${group.companyName} 선택`}
                          />
                        </td>
                        <td className="px-4 py-4 text-gray-900 font-medium whitespace-nowrap">
                          {group.companyName}
                          {group.lineCount > 1 && (
                            <span className={`ml-1.5 text-xs font-normal px-1.5 py-0.5 rounded ${badgeClass}`}>
                              통합 {group.lineCount}건
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-gray-600 max-w-[240px]">
                          <span className="line-clamp-2" title={group.address}>
                            {group.address}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                          {group.recipientName}
                        </td>
                        <td className="px-4 py-4 text-gray-600">
                          <span className="line-clamp-2 text-sm" title={group.orderRefsLabel}>
                            {group.orderRefsLabel}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-gray-900 font-medium text-right whitespace-nowrap">
                          {group.totalAmount > 0
                            ? `₩${group.totalAmount.toLocaleString()}`
                            : '-'}
                        </td>
                        <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                          {formatStatementDate(group.latestUpdatedAt)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleViewStatement(group)}
                              className={`inline-flex items-center gap-1 px-2 py-1.5 text-xs rounded-md border disabled:opacity-50 ${accentButtonClass}`}
                            >
                              {isBusy ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                              보기
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleDownloadStatement(group)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs rounded-md border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                              <Download className="w-3.5 h-3.5" />
                              다운로드
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleCancelStatement(group)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs rounded-md border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50"
                            >
                              {isBusy ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5" />
                              )}
                              명세서 취소
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
