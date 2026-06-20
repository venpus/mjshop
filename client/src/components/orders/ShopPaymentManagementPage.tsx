import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search, Wallet } from 'lucide-react';
import { getShopBuyerById, getShopBuyers } from '../../api/shopBuyerApi';
import {
  getShopOrders,
  updateShopOrderStatementPayment,
  type ShopOrder,
} from '../../api/shopOrderApi';
import { useShopOrderListPagination } from '../../hooks/useShopOrderListPagination';
import {
  companyNameMatchesKakaoSearch,
  findShopBuyerByCompanyName,
  resolveKakaoIdDisplay,
} from '../../utils/shopBuyerDisplay';
import {
  buildShopOrderStatementListRows,
  buildStatementGroupPreviewItems,
  groupShopOrderStatementRows,
  mergeStatementAmountBreakdowns,
  type ShopOrderLineListRow,
  type ShopOrderStatementGroupRow,
  type StatementAmountBreakdown,
} from '../../utils/shopOrderListExport';
import { formatLineOrderRef, matchesLineDateRange } from '../../utils/shopOrderLineListUtils';
import type { ShopBuyer, ShopBuyerListItem } from '../buyers/types';
import { ShopBuyerInfoModal } from './ShopBuyerInfoModal';
import { ShopOrderListPagination } from './ShopOrderListPagination';
import { ShopOrderProductInfoModal } from './ShopOrderProductInfoModal';
import { shopOrderDetailPath } from './shopOrderListNavigation';

const PAYMENT_RETURN_PATH = '/admin/shop-payment';
const linkButtonClass =
  'text-left text-purple-700 hover:text-purple-900 hover:underline disabled:opacity-50';

function formatStatementDate(value: string | null | undefined): string {
  if (!value) return '-';
  const datePart = value.includes('T') ? value.split('T')[0] : value.slice(0, 10);
  const date = new Date(datePart);
  if (Number.isNaN(date.getTime())) return datePart;
  return date.toLocaleDateString('ko-KR');
}

function formatKrwAmount(value: number): string {
  return `₩${value.toLocaleString()}`;
}

function buildAllStatementGroups(orders: ShopOrder[]): ShopOrderStatementGroupRow[] {
  const rows = [
    ...buildShopOrderStatementListRows(orders, 'orders'),
    ...buildShopOrderStatementListRows(orders, 'reservations'),
  ];

  return groupShopOrderStatementRows(rows).sort((a, b) => {
    const dateA = a.statementIssuedAt ?? a.latestUpdatedAt;
    const dateB = b.statementIssuedAt ?? b.latestUpdatedAt;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });
}

function filterScopeStatements(
  statements: ShopOrderStatementGroupRow[],
  searchTerm: string,
  dateFrom: string,
  dateTo: string,
  buyers: ShopBuyerListItem[]
): ShopOrderStatementGroupRow[] {
  let result = statements;

  if (dateFrom || dateTo) {
    result = result.filter((statement) =>
      matchesLineDateRange(
        statement.statementIssuedAt ?? statement.latestUpdatedAt?.slice(0, 10) ?? null,
        dateFrom,
        dateTo
      )
    );
  }

  const lower = searchTerm.trim().toLowerCase();
  if (!lower) return result;

  return result.filter(
    (statement) =>
      statement.companyName.toLowerCase().includes(lower) ||
      companyNameMatchesKakaoSearch(statement.companyName, lower, buyers) ||
      statement.orderRefsLabel.toLowerCase().includes(lower) ||
      statement.productNamesLabel.toLowerCase().includes(lower) ||
      statement.lines.some(
        (row) =>
          row.orderNumber.toLowerCase().includes(lower) ||
          (row.line.lineOrderNumber ?? '').toLowerCase().includes(lower) ||
          row.productName.toLowerCase().includes(lower)
      )
  );
}

function statementToBreakdown(statement: ShopOrderStatementGroupRow): StatementAmountBreakdown {
  return {
    productSupplyAmount: statement.productSupplyAmount,
    vatAmount: statement.vatAmount,
    deliveryFee: statement.deliveryFee,
    totalAmount: statement.totalAmount,
  };
}

function PaymentAmountBreakdownCell({ breakdown }: { breakdown: StatementAmountBreakdown }) {
  if (breakdown.totalAmount <= 0) {
    return <span className="text-gray-400">-</span>;
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="tabular-nums font-semibold text-gray-900">
        {formatKrwAmount(breakdown.totalAmount)}
      </span>
      <span className="text-[10px] tabular-nums text-gray-500">
        공급가 {formatKrwAmount(breakdown.productSupplyAmount)}
      </span>
      <span className="text-[10px] tabular-nums text-gray-500">
        VAT {formatKrwAmount(breakdown.vatAmount)}
      </span>
      {breakdown.deliveryFee > 0 && (
        <span className="text-[10px] tabular-nums text-gray-500">
          택배비 {formatKrwAmount(breakdown.deliveryFee)}
        </span>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  breakdown,
  count,
  tone,
}: {
  label: string;
  breakdown: StatementAmountBreakdown;
  count: number;
  tone: 'neutral' | 'paid' | 'unpaid';
}) {
  const toneClass =
    tone === 'paid'
      ? 'border-emerald-200 bg-emerald-50'
      : tone === 'unpaid'
        ? 'border-amber-200 bg-amber-50'
        : 'border-gray-200 bg-white';

  const amountClass =
    tone === 'paid'
      ? 'text-emerald-800'
      : tone === 'unpaid'
        ? 'text-amber-800'
        : 'text-gray-900';

  return (
    <div className={`rounded-lg border px-4 py-3 ${toneClass}`}>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${amountClass}`}>
        {formatKrwAmount(breakdown.totalAmount)}
      </p>
      {breakdown.totalAmount > 0 && (
        <div className="mt-1 space-y-0.5 text-[10px] tabular-nums text-gray-500">
          <p>공급가 {formatKrwAmount(breakdown.productSupplyAmount)}</p>
          <p>VAT {formatKrwAmount(breakdown.vatAmount)}</p>
          {breakdown.deliveryFee > 0 && <p>택배비 {formatKrwAmount(breakdown.deliveryFee)}</p>}
        </div>
      )}
      <p className="mt-1 text-xs text-gray-500">{count.toLocaleString()}장</p>
    </div>
  );
}

export function ShopPaymentManagementPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [onlyUnpaid, setOnlyUnpaid] = useState(false);
  const [savingGroupKey, setSavingGroupKey] = useState<string | null>(null);
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
  const [productModalOrder, setProductModalOrder] = useState<ShopOrder | null>(null);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getShopOrders();
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '입금 목록을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

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

  const orderById = useMemo(() => new Map(orders.map((order) => [order.id, order])), [orders]);

  const allStatements = useMemo(() => buildAllStatementGroups(orders), [orders]);

  const scopeStatements = useMemo(
    () => filterScopeStatements(allStatements, searchTerm, dateFrom, dateTo, buyers),
    [allStatements, searchTerm, dateFrom, dateTo, buyers]
  );

  const displayStatements = useMemo(
    () => (onlyUnpaid ? scopeStatements.filter((statement) => !statement.paymentReceived) : scopeStatements),
    [scopeStatements, onlyUnpaid]
  );

  const summary = useMemo(() => {
    const paidStatements = scopeStatements.filter((statement) => statement.paymentReceived);
    const unpaidStatements = scopeStatements.filter((statement) => !statement.paymentReceived);

    const totalBreakdown = mergeStatementAmountBreakdowns(
      scopeStatements.map(statementToBreakdown)
    );
    const paidBreakdown = mergeStatementAmountBreakdowns(
      paidStatements.map(statementToBreakdown)
    );
    const unpaidBreakdown = mergeStatementAmountBreakdowns(
      unpaidStatements.map(statementToBreakdown)
    );

    return {
      totalBreakdown,
      paidBreakdown,
      unpaidBreakdown,
      totalCount: scopeStatements.length,
      paidCount: paidStatements.length,
      unpaidCount: unpaidStatements.length,
    };
  }, [scopeStatements]);

  const paginationResetKey = `${searchTerm}|${dateFrom}|${dateTo}|${onlyUnpaid ? 'unpaid' : 'all'}`;
  const {
    paginatedItems: paginatedStatements,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
  } = useShopOrderListPagination(displayStatements, paginationResetKey);

  const patchOrdersPaymentReceived = (
    items: Array<{ shopOrderId: string; lineId: string }>,
    paymentReceived: boolean
  ) => {
    const keySet = new Set(items.map((item) => `${item.shopOrderId}:${item.lineId}`));
    setOrders((prev) =>
      prev.map((order) => ({
        ...order,
        lines: order.lines.map((line) =>
          keySet.has(`${order.id}:${line.id}`) ? { ...line, paymentReceived } : line
        ),
      }))
    );
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
    setSavingGroupKey(statement.groupKey);

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
      alert(err instanceof Error ? err.message : '입금완료 저장에 실패했습니다.');
    } finally {
      setSavingGroupKey(null);
    }
  };

  const handleOrderClick = (row: ShopOrderLineListRow) => {
    navigate(
      shopOrderDetailPath(
        row.shopOrderId,
        row.line.isReservation ? 'reservations' : 'lines',
        PAYMENT_RETURN_PATH
      )
    );
  };

  const handleCompanyNameClick = async (statement: ShopOrderStatementGroupRow) => {
    const representativeLine = statement.lines[0]?.line;
    const companyName = statement.companyName?.trim();
    if (!companyName || !representativeLine) return;

    setBuyerModalOpen(true);
    setBuyerModalLoading(true);
    setSelectedBuyer(null);
    setBuyerModalCompanyName(companyName);
    setBuyerUnmatchedMessage(null);
    setBuyerOrderLineInfo({
      address: representativeLine.address,
      recipientName: representativeLine.recipientName,
      phoneNumber: representativeLine.phoneNumber,
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

  const handleProductClick = (row: ShopOrderLineListRow) => {
    const order = orderById.get(row.shopOrderId);
    if (!order) return;
    setProductModalOrder(order);
  };

  return (
    <div className="p-8 min-h-[1080px]">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-6 h-6 text-purple-600" />
          <h2 className="text-gray-900">입금 관리</h2>
        </div>
        <p className="text-gray-600">
          발행된 명세서 기준으로 입금 예정 금액을 확인하고, 입금 완료 여부를 관리합니다.
          총금액은 <span className="font-medium text-gray-800">공급가 + VAT(10%) + 택배비</span>로
          구성됩니다.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <SummaryCard
          label="명세서 총 금액"
          breakdown={summary.totalBreakdown}
          count={summary.totalCount}
          tone="neutral"
        />
        <SummaryCard
          label="입금 금액"
          breakdown={summary.paidBreakdown}
          count={summary.paidCount}
          tone="paid"
        />
        <SummaryCard
          label="미입금 금액"
          breakdown={summary.unpaidBreakdown}
          count={summary.unpaidCount}
          tone="unpaid"
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-200 bg-gray-50/80">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="주문번호, 상호명, 카톡, 상품명 검색"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setOnlyUnpaid((prev) => !prev)}
            className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
              onlyUnpaid
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            미입금만
            {summary.unpaidCount > 0 && (
              <span className="ml-1 opacity-80">({summary.unpaidCount.toLocaleString()})</span>
            )}
          </button>
          <span className="text-sm font-medium text-gray-600">명세서 날짜</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <span className="text-gray-400">~</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
              className="px-2 py-1 text-sm text-gray-500 hover:text-gray-700"
            >
              날짜 초기화
            </button>
          )}
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
            <p>입금 목록을 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-red-600">{error}</div>
        ) : allStatements.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            발행된 명세서가 없습니다. 주문 관리에서 명세서를 생성해 주세요.
          </div>
        ) : displayStatements.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            {onlyUnpaid ? '미입금 명세서가 없습니다.' : '검색·필터 조건에 맞는 명세서가 없습니다.'}
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
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-center font-medium text-gray-600 whitespace-nowrap w-24">
                      입금완료
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">
                      명세서 날짜
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">
                      상호명
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">
                      카톡 아이디
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap min-w-[140px]">
                      주문번호
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">
                      구분
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600 whitespace-nowrap">
                      입금 예정 금액
                      <span className="block text-[10px] font-normal text-gray-400">
                        공급가+VAT+택배비
                      </span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap min-w-[180px]">
                      상품
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedStatements.map((statement) => {
                    const isSaving = savingGroupKey === statement.groupKey;

                    return (
                      <tr
                        key={statement.groupKey}
                        className={`hover:bg-gray-50/60 ${
                          statement.paymentReceived ? 'bg-emerald-50/30' : ''
                        }`}
                      >
                        <td className="px-4 py-3 text-center">
                          <label className="inline-flex items-center justify-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={statement.paymentReceived}
                              disabled={isSaving}
                              onChange={(event) =>
                                void handleTogglePaymentReceived(statement, event.target.checked)
                              }
                              className="w-4 h-4 accent-emerald-600 cursor-pointer disabled:opacity-50"
                              aria-label={`${statement.companyName} 입금완료`}
                            />
                            {isSaving && (
                              <Loader2 className="w-3.5 h-3.5 ml-1 animate-spin text-gray-400" />
                            )}
                          </label>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900 tabular-nums">
                          {formatStatementDate(statement.statementIssuedAt)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap max-w-[140px]">
                          <button
                            type="button"
                            onClick={() => void handleCompanyNameClick(statement)}
                            className={`font-medium truncate max-w-[140px] block ${linkButtonClass}`}
                            title="구매자 정보 보기"
                          >
                            {(statement.companyName ?? '').trim() || '-'}
                          </button>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 max-w-[120px] truncate">
                          {resolveKakaoIdDisplay(statement.companyName, buyers)}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          <div className="flex flex-col gap-0.5">
                            {statement.lines.map((row) => (
                              <button
                                key={row.rowKey}
                                type="button"
                                onClick={() => handleOrderClick(row)}
                                className={`font-mono text-xs ${linkButtonClass}`}
                                title="주문 상세 보기"
                              >
                                {formatLineOrderRef(
                                  row.line.lineOrderNumber,
                                  row.orderNumber,
                                  row.lineIndex,
                                  row.line.isReservation ? '예약' : undefined
                                )}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                              statement.isReservation
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {statement.isReservation ? '예약' : '주문'}
                          </span>
                          {statement.lineCount > 1 && (
                            <span className="ml-1 text-xs text-gray-500">
                              {statement.lineCount}건
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <PaymentAmountBreakdownCell breakdown={statementToBreakdown(statement)} />
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-[240px]">
                          <div className="flex flex-col gap-0.5">
                            {statement.lines.map((row) => (
                              <button
                                key={row.rowKey}
                                type="button"
                                onClick={() => handleProductClick(row)}
                                className={`truncate max-w-[240px] block ${linkButtonClass}`}
                                title="상품 정보 보기"
                              >
                                {row.productName}
                              </button>
                            ))}
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

      <ShopBuyerInfoModal
        isOpen={buyerModalOpen}
        onClose={handleCloseBuyerModal}
        buyer={selectedBuyer}
        isLoading={buyerModalLoading}
        companyName={buyerModalCompanyName}
        unmatchedMessage={buyerUnmatchedMessage}
        orderLineInfo={buyerOrderLineInfo ?? undefined}
        hideBusinessRegistrationImage
      />
      <ShopOrderProductInfoModal
        isOpen={productModalOrder != null}
        order={productModalOrder}
        onClose={() => setProductModalOrder(null)}
      />
    </div>
  );
}
