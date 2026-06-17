import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import {
  getShopOrders,
  updateShopOrderLineCnyExchangeRate,
  type ShopOrder,
} from '../../api/shopOrderApi';
import { getShopBuyerById, getShopBuyers } from '../../api/shopBuyerApi';
import { getShopShipmentBatches, type ShopShipmentBatchListItem } from '../../api/shopShipmentApi';
import {
  getSalesSettlementLedgerSummaries,
  type SalesSettlementLedgerSummaries,
} from '../../api/shopSalesSettlementLedgerApi';
import { useShopOrderListPagination } from '../../hooks/useShopOrderListPagination';
import {
  buildExchangeRateInputsFromOrders,
  buildLineBatchLogisticsPaidMap,
  buildLineLogisticsFeeMap,
  buildSalesSettlementRows,
  formatCnyAmount,
  formatKrwAmount,
  formatSalesSettlementOrderRef,
  parseCnyExchangeRateInput,
  sumAvailableAmounts,
  type SalesSettlementRow,
} from '../../utils/shopSalesSettlement';
import { matchesLineDateRange } from '../../utils/shopOrderLineListUtils';
import { findShopBuyerByCompanyName, resolveCompanyNameDisplay } from '../../utils/shopBuyerDisplay';
import type { ShopBuyer, ShopBuyerListItem } from '../buyers/types';
import { ShopBuyerInfoModal } from '../orders/ShopBuyerInfoModal';
import { ShopOrderProductInfoModal } from '../orders/ShopOrderProductInfoModal';
import { ShopOrderListPagination } from '../orders/ShopOrderListPagination';
import { SalesSettlementStatsPanel } from './SalesSettlementStatsPanel';

function formatProfitAmount(value: number | null): string {
  if (value == null) return '-';
  return formatKrwAmount(value);
}

function normalizeExchangeRateInput(input: string): string {
  return input.trim();
}

function exchangeRateValueToSave(input: string): number | null {
  const normalized = normalizeExchangeRateInput(input);
  if (!normalized) return null;
  return parseCnyExchangeRateInput(normalized);
}

export function SalesSettlementPage() {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [batches, setBatches] = useState<ShopShipmentBatchListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exchangeRateInputs, setExchangeRateInputs] = useState<Record<string, string>>({});
  const [savedExchangeRateInputs, setSavedExchangeRateInputs] = useState<Record<string, string>>({});
  const [savingRowKeys, setSavingRowKeys] = useState<Record<string, boolean>>({});
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(new Set());
  const [ledgerTotals, setLedgerTotals] = useState<SalesSettlementLedgerSummaries>({
    wk: { totalAmount: 0, entryCount: 0 },
    inventio: { totalAmount: 0, entryCount: 0 },
  });
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

  const loadLedgerTotals = useCallback(async () => {
    try {
      const summaries = await getSalesSettlementLedgerSummaries();
      setLedgerTotals(summaries);
    } catch {
      // 장부 요약 실패 시 기본값 유지
    }
  }, []);

  const exchangeRatesByRowKey = useMemo(() => {
    const rates: Record<string, number | null> = {};
    for (const [rowKey, input] of Object.entries(exchangeRateInputs)) {
      rates[rowKey] = parseCnyExchangeRateInput(input);
    }
    return rates;
  }, [exchangeRateInputs]);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [data, batchData] = await Promise.all([
        getShopOrders(),
        getShopShipmentBatches(),
        loadLedgerTotals(),
      ]);
      setOrders(data);
      setBatches(batchData);
      const inputs = buildExchangeRateInputsFromOrders(data);
      setExchangeRateInputs(inputs);
      setSavedExchangeRateInputs(inputs);
    } catch (err) {
      setError(err instanceof Error ? err.message : '주문 목록을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [loadLedgerTotals]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const lineLogisticsFeeByLineId = useMemo(
    () => buildLineLogisticsFeeMap(batches),
    [batches]
  );

  const lineBatchPaidMap = useMemo(
    () => buildLineBatchLogisticsPaidMap(batches),
    [batches]
  );

  const settlementRows = useMemo(
    () => buildSalesSettlementRows(orders, exchangeRatesByRowKey, lineLogisticsFeeByLineId),
    [orders, exchangeRatesByRowKey, lineLogisticsFeeByLineId]
  );

  const orderById = useMemo(() => new Map(orders.map((order) => [order.id, order])), [orders]);

  const lineByKey = useMemo(() => {
    const map = new Map<string, { address: string | null; recipientName: string | null; phoneNumber: string | null }>();
    for (const order of orders) {
      for (const line of order.lines) {
        map.set(`${order.id}:${line.id}`, {
          address: line.address,
          recipientName: line.recipientName,
          phoneNumber: line.phoneNumber,
        });
      }
    }
    return map;
  }, [orders]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return settlementRows.filter((row) => {
      const matchesSearch =
        !term ||
        [
          row.orderNumber,
          row.companyName ?? '',
          row.productName,
          formatSalesSettlementOrderRef(row),
          row.isReservation ? '예약' : '일반',
        ]
          .join(' ')
          .toLowerCase()
          .includes(term);

      const matchesDate = matchesLineDateRange(row.orderDate, dateFrom, dateTo);

      return matchesSearch && matchesDate;
    });
  }, [settlementRows, searchTerm, dateFrom, dateTo]);

  const paginationResetKey = `${searchTerm}|${dateFrom}|${dateTo}`;

  useEffect(() => {
    setSelectedRowKeys(new Set());
  }, [paginationResetKey]);

  const {
    paginatedItems,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
  } = useShopOrderListPagination(filteredRows, paginationResetKey);

  const selectedRows = useMemo(
    () => filteredRows.filter((row) => selectedRowKeys.has(row.rowKey)),
    [filteredRows, selectedRowKeys]
  );

  const statsRows = selectedRows.length > 0 ? selectedRows : filteredRows;
  const selectedQuantityTotal = useMemo(
    () => selectedRows.reduce((sum, row) => sum + row.lineQuantity, 0),
    [selectedRows]
  );
  const statsSelectionLabel =
    selectedRows.length > 0 ? (
      <>
        선택 {selectedRows.length.toLocaleString()}건
        <span className="mx-1.5 text-gray-300">·</span>
        <span className="font-semibold text-gray-800">
          {selectedQuantityTotal.toLocaleString()}개
        </span>{' '}
        기준
      </>
    ) : null;

  const allPageSelected =
    paginatedItems.length > 0 &&
    paginatedItems.every((row) => selectedRowKeys.has(row.rowKey));

  const handleToggleSelectAll = () => {
    setSelectedRowKeys((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        paginatedItems.forEach((row) => next.delete(row.rowKey));
      } else {
        paginatedItems.forEach((row) => next.add(row.rowKey));
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

  const handleExchangeRateChange = (rowKey: string, value: string) => {
    setExchangeRateInputs((prev) => ({ ...prev, [rowKey]: value }));
    setSaveErrors((prev) => {
      if (!(rowKey in prev)) return prev;
      const next = { ...prev };
      delete next[rowKey];
      return next;
    });
  };

  const saveExchangeRate = useCallback(
    async (row: SalesSettlementRow) => {
      if (row.isLegacyLine) return;

      const input = exchangeRateInputs[row.rowKey] ?? '';
      const normalizedInput = normalizeExchangeRateInput(input);
      const savedInput = savedExchangeRateInputs[row.rowKey] ?? '';

      if (normalizedInput === savedInput.trim()) {
        return;
      }

      if (normalizedInput && parseCnyExchangeRateInput(normalizedInput) == null) {
        setSaveErrors((prev) => ({
          ...prev,
          [row.rowKey]: '유효한 환율을 입력해 주세요.',
        }));
        return;
      }

      const valueToSave = exchangeRateValueToSave(input);

      setSavingRowKeys((prev) => ({ ...prev, [row.rowKey]: true }));
      setSaveErrors((prev) => {
        const next = { ...prev };
        delete next[row.rowKey];
        return next;
      });

      try {
        const updatedLine = await updateShopOrderLineCnyExchangeRate(
          row.shopOrderId,
          row.lineId,
          valueToSave
        );
        const savedValue =
          updatedLine.cnyExchangeRate != null ? String(updatedLine.cnyExchangeRate) : '';

        setOrders((prev) =>
          prev.map((order) =>
            order.id !== row.shopOrderId
              ? order
              : {
                  ...order,
                  lines: order.lines.map((line) =>
                    line.id === row.lineId
                      ? { ...line, cnyExchangeRate: updatedLine.cnyExchangeRate }
                      : line
                  ),
                }
          )
        );
        setExchangeRateInputs((prev) => ({ ...prev, [row.rowKey]: savedValue }));
        setSavedExchangeRateInputs((prev) => ({ ...prev, [row.rowKey]: savedValue }));
      } catch (err) {
        setSaveErrors((prev) => ({
          ...prev,
          [row.rowKey]: err instanceof Error ? err.message : '환율 저장에 실패했습니다.',
        }));
      } finally {
        setSavingRowKeys((prev) => {
          const next = { ...prev };
          delete next[row.rowKey];
          return next;
        });
      }
    },
    [exchangeRateInputs, savedExchangeRateInputs]
  );

  const handleExchangeRateBlur = (row: SalesSettlementRow) => {
    void saveExchangeRate(row);
  };

  const handleExchangeRateKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    row: SalesSettlementRow
  ) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
    }
  };

  const handleCompanyNameClick = async (row: SalesSettlementRow) => {
    const companyName = row.companyName?.trim();
    if (!companyName) return;

    setBuyerModalOpen(true);
    setBuyerModalLoading(true);
    setSelectedBuyer(null);
    setBuyerModalCompanyName(companyName);
    setBuyerUnmatchedMessage(null);
    setBuyerOrderLineInfo(lineByKey.get(row.rowKey) ?? null);

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

  const handleProductNameClick = (row: SalesSettlementRow) => {
    const order = orderById.get(row.shopOrderId);
    if (!order) return;
    setProductModalOrder(order);
  };

  const pageTotals = useMemo(
    () => ({
      salesAmountExVat: sumAvailableAmounts(paginatedItems.map((row) => row.salesAmountExVat)),
      vatAmount: sumAvailableAmounts(paginatedItems.map((row) => row.vatAmount)),
      costAmountKrw: sumAvailableAmounts(paginatedItems.map((row) => row.costAmountKrw)),
      profitAmount: sumAvailableAmounts(paginatedItems.map((row) => row.profitAmount)),
      calculatedCount: paginatedItems.filter((row) => row.profitAmount != null).length,
    }),
    [paginatedItems]
  );

  const dateFilterActive = Boolean(dateFrom || dateTo);

  return (
    <div className="p-8 min-h-[1080px]">
      <div className="mb-8">
        <h2 className="text-gray-900 mb-2">판매금 정산</h2>
        <p className="text-gray-600">
          주문 건별로 위안 환율을 입력하면 판매 대금에서 판매 원가와 물류 수수료를 차감한
          최종 판매 이익을 WK 정산금(60%), 인벤티오 정산금(40%)으로 구분해 확인할 수 있습니다.
          물류 수수료는 배송관리에서 입력·지급하고, WK·인벤티오 정산은 장부에 등록한 금액만큼 이익금에서 차감됩니다.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col xl:flex-row xl:items-end gap-4">
          <div className="flex-1 min-w-[240px]">
            <label htmlFor="settlement-search" className="block text-sm font-medium text-gray-700 mb-1">
              검색
            </label>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="settlement-search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="주문번호, 상호, 상품명"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-1">등록일</span>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  aria-label="등록일 시작"
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-gray-400">~</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  aria-label="등록일 종료"
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {dateFilterActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setDateFrom('');
                      setDateTo('');
                    }}
                    className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
                  >
                    날짜 초기화
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="mt-3 text-sm text-gray-500">
          {filteredRows.length.toLocaleString()}건 표시
          {selectedRows.length > 0 && (
            <span className="text-purple-700"> · 선택 {selectedRows.length.toLocaleString()}건</span>
          )}
          {dateFilterActive || searchTerm ? ' (필터 적용됨)' : ''}
        </p>

        <p className="mt-3 text-xs text-gray-500">
          판매 원가(₩) = 최종원가(¥/개) × 주문 수량 × 건별 환율 · 물류 수수료 = 배송관리
          (박스수×1,200+택배비+박스가) ÷ 포함 주문건 수 · 최종 판매 이익 = 판매 대금 − 판매 원가 −
          물류 수수료 · 파트너 이익 분배 = WK 60% / 인벤티오 40%
        </p>

        <SalesSettlementStatsPanel
          rows={statsRows}
          lineBatchPaidMap={lineBatchPaidMap}
          ledgerTotals={ledgerTotals}
          dateFilterActive={dateFilterActive && selectedRows.length === 0}
          selectionLabel={statsSelectionLabel}
          onLedgerChanged={loadLedgerTotals}
        />
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
                  <th className="px-3 py-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 cursor-pointer accent-purple-600"
                      aria-label="현재 페이지 전체 선택"
                    />
                  </th>
                  <th className="px-3 py-3 text-left font-medium text-gray-600 whitespace-nowrap">주문</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-600 whitespace-nowrap">등록일</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-600 whitespace-nowrap">상호</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-600 whitespace-nowrap">상품</th>
                  <th className="px-3 py-3 text-right font-medium text-gray-600 whitespace-nowrap">박스</th>
                  <th className="px-3 py-3 text-right font-medium text-gray-600 whitespace-nowrap">수량</th>
                  <th className="px-3 py-3 text-right font-medium text-gray-600 whitespace-nowrap">원가(¥/개)</th>
                  <th className="px-3 py-3 text-right font-medium text-gray-600 whitespace-nowrap">
                    환율
                    <span className="block text-[10px] font-normal text-gray-400">₩/¥ · 저장</span>
                  </th>
                  <th className="px-3 py-3 text-right font-medium text-gray-600 whitespace-nowrap">
                    판매 대금
                    <span className="block text-[10px] font-normal text-gray-400">VAT 미포함</span>
                  </th>
                  <th className="px-3 py-3 text-right font-medium text-gray-600 whitespace-nowrap">
                    VAT
                    <span className="block text-[10px] font-normal text-gray-400">부가세</span>
                  </th>
                  <th className="px-3 py-3 text-right font-medium text-gray-600 whitespace-nowrap">
                    판매 원가(₩)
                    <span className="block text-[10px] font-normal text-gray-400">¥×수량×환율</span>
                  </th>
                  <th className="px-3 py-3 text-right font-medium text-gray-600 whitespace-nowrap">
                    최종 판매 이익
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-3 py-12 text-center text-gray-500">
                      표시할 주문 건이 없습니다.
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((row) => {
                    const isSaving = Boolean(savingRowKeys[row.rowKey]);
                    const saveError = saveErrors[row.rowKey];
                    const isDirty =
                      normalizeExchangeRateInput(exchangeRateInputs[row.rowKey] ?? '') !==
                      normalizeExchangeRateInput(savedExchangeRateInputs[row.rowKey] ?? '');
                    const isSelected = selectedRowKeys.has(row.rowKey);

                    return (
                      <tr
                        key={row.rowKey}
                        className={row.isReservation ? 'hover:bg-amber-50/60 bg-amber-50/30' : 'hover:bg-gray-50'}
                      >
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(row.rowKey)}
                            className="w-4 h-4 cursor-pointer accent-purple-600"
                            aria-label={`${formatSalesSettlementOrderRef(row)} 선택`}
                          />
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-medium text-gray-900">
                            <span className="select-text cursor-text">
                              {formatSalesSettlementOrderRef(row)}
                            </span>
                            {row.isReservation && (
                              <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                예약
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-gray-700">{row.orderDate ?? '-'}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-gray-700 max-w-[120px]">
                          {row.companyName ? (
                            <button
                              type="button"
                              onClick={() => void handleCompanyNameClick(row)}
                              className="truncate max-w-[120px] block text-left text-purple-700 hover:text-purple-900 hover:underline"
                              title="구매자 정보 보기"
                            >
                              {resolveCompanyNameDisplay(row.companyName, buyers)}
                            </button>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-3 py-3 text-gray-700 max-w-[160px]">
                          <button
                            type="button"
                            onClick={() => handleProductNameClick(row)}
                            className="truncate max-w-[160px] block text-left text-purple-700 hover:text-purple-900 hover:underline"
                            title="상품 정보 보기"
                          >
                            {row.productName}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-gray-700">
                          {row.orderBoxCount.toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-gray-700">
                          {row.lineQuantity.toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-gray-700">
                          {formatCnyAmount(row.unitCostCny)}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-col items-end gap-0.5">
                            <div className="relative">
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={exchangeRateInputs[row.rowKey] ?? ''}
                                onChange={(e) => handleExchangeRateChange(row.rowKey, e.target.value)}
                                onBlur={() => handleExchangeRateBlur(row)}
                                onKeyDown={(e) => handleExchangeRateKeyDown(e, row)}
                                disabled={row.isLegacyLine || isSaving}
                                placeholder="195.5"
                                aria-label={`${formatSalesSettlementOrderRef(row)} 환율`}
                                className={`w-[96px] px-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-right tabular-nums disabled:bg-gray-100 disabled:text-gray-500 ${
                                  saveError
                                    ? 'border-red-400'
                                    : isDirty
                                      ? 'border-amber-400'
                                      : 'border-gray-300'
                                }`}
                              />
                              {isSaving && (
                                <Loader2 className="absolute -right-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-purple-500" />
                              )}
                            </div>
                            {saveError && (
                              <span className="text-[10px] text-red-600 max-w-[96px] text-right leading-tight">
                                {saveError}
                              </span>
                            )}
                            {row.isLegacyLine && (
                              <span className="text-[10px] text-gray-400">저장 불가</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-gray-900">
                          {formatKrwAmount(row.salesAmountExVat)}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-gray-600">
                          {formatKrwAmount(row.vatAmount)}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-gray-700">
                          {formatKrwAmount(row.costAmountKrw)}
                        </td>
                        <td
                          className={`px-3 py-3 text-right tabular-nums font-semibold ${
                            row.profitAmount == null
                              ? 'text-gray-400'
                              : row.profitAmount < 0
                                ? 'text-red-600'
                                : 'text-emerald-700'
                          }`}
                        >
                          {formatProfitAmount(row.profitAmount)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {paginatedItems.length > 0 && (
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={9} className="px-3 py-3 text-right font-medium text-gray-700">
                      현재 페이지 합계
                      {pageTotals.calculatedCount > 0 && (
                        <span className="ml-1 text-xs font-normal text-gray-500">
                          (이익 {pageTotals.calculatedCount}건)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-medium text-gray-900">
                      {formatKrwAmount(pageTotals.salesAmountExVat)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-medium text-gray-600">
                      {formatKrwAmount(pageTotals.vatAmount)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-medium text-gray-700">
                      {formatKrwAmount(pageTotals.costAmountKrw)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold text-emerald-700">
                      {formatProfitAmount(
                        pageTotals.calculatedCount > 0 ? pageTotals.profitAmount : null
                      )}
                    </td>
                  </tr>
                </tfoot>
              )}
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
