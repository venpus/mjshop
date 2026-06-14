import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Eye, Loader2, Search, XCircle } from 'lucide-react';
import {
  cancelShopOrderStatements,
  downloadShopOrderStatement,
  getShopOrderStatementPreview,
  getShopOrders,
  type ShopOrder,
} from '../../api/shopOrderApi';
import { useShopOrderListPagination } from '../../hooks/useShopOrderListPagination';
import {
  buildShopOrderStatementListRows,
  groupShopOrderStatementRows,
  type ShopOrderStatementGroupRow,
} from '../../utils/shopOrderListExport';
import { ShopOrderListPagination } from './ShopOrderListPagination';
import { ShopOrderStatementModal } from './ShopOrderStatementModal';

function formatStatementDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString('ko-KR');
}

function buildGroupTitle(group: ShopOrderStatementGroupRow): string {
  if (group.lineCount > 1) {
    return `${group.companyName} (통합 ${group.lineCount}건)`;
  }
  return group.companyName;
}

export function ShopStatementsPage() {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [busyGroupKey, setBusyGroupKey] = useState<string | null>(null);
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

  const statementLineCount = useMemo(
    () => buildShopOrderStatementListRows(orders).length,
    [orders]
  );

  const statementGroups = useMemo(() => {
    const rows = buildShopOrderStatementListRows(orders);
    return groupShopOrderStatementRows(rows).sort(
      (a, b) => new Date(b.latestUpdatedAt).getTime() - new Date(a.latestUpdatedAt).getTime()
    );
  }, [orders]);

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

  const handleViewStatement = async (group: ShopOrderStatementGroupRow) => {
    setBusyGroupKey(group.groupKey);
    try {
      const preview = await getShopOrderStatementPreview(
        group.previewShopOrderId,
        group.previewLineId
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
      await downloadShopOrderStatement(group.previewShopOrderId, group.previewLineId);
    } catch (err) {
      alert(err instanceof Error ? err.message : '명세서 다운로드 중 오류가 발생했습니다.');
    } finally {
      setBusyGroupKey(null);
    }
  };

  const handleCancelStatement = async (group: ShopOrderStatementGroupRow) => {
    const message =
      group.lineCount > 1
        ? `「${group.companyName}」 통합 명세서(${group.lineCount}건)를 취소하시겠습니까?\n포함된 모든 주문건에서 명세서 발행이 해제됩니다.`
        : `「${group.companyName}」 명세서를 취소하시겠습니까?`;

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

  return (
    <div className="p-8 min-h-[1080px]">
      <div className="mb-8">
        <h2 className="text-gray-900 mb-2">명세서 모아보기</h2>
        <p className="text-gray-600">
          상호명·주소·수령인이 같은 명세서를 묶어서 보여줍니다. 통합 명세서는 한 장으로
          미리보기·다운로드할 수 있습니다.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <p className="text-gray-600 mb-1">명세서 (묶음)</p>
          <p className="text-gray-900">{statementGroups.length.toLocaleString()}장</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <p className="text-gray-600 mb-1">포함 주문건</p>
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
            disabled={isLoading}
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-white disabled:opacity-50"
          >
            새로고침
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
              ? '발행된 명세서가 없습니다. 주문 관리에서 명세서를 생성해 주세요.'
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
                    <th className="px-4 py-3 text-left text-gray-600 whitespace-nowrap">상호명</th>
                    <th className="px-4 py-3 text-left text-gray-600 whitespace-nowrap">주소</th>
                    <th className="px-4 py-3 text-left text-gray-600 whitespace-nowrap">수령인</th>
                    <th className="px-4 py-3 text-left text-gray-600 whitespace-nowrap">포함 주문</th>
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
                    const isBusy = busyGroupKey === group.groupKey;

                    return (
                      <tr key={group.groupKey} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-gray-900 font-medium whitespace-nowrap">
                          {group.companyName}
                          {group.lineCount > 1 && (
                            <span className="ml-1.5 text-xs font-normal text-purple-700">
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
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs rounded-md border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 disabled:opacity-50"
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
