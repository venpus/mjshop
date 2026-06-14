import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import {
  getShopOrders,
  updateShopOrderLineCnyExchangeRate,
  updateShopOrderLineSettlementPayment,
  updateShopOrderLineShipmentBoxCount,
  type ShopOrder,
} from '../../api/shopOrderApi';
import { useShopOrderListPagination } from '../../hooks/useShopOrderListPagination';
import {
  buildExchangeRateInputsFromOrders,
  buildSalesSettlementRows,
  buildShipmentBoxInputsFromOrders,
  formatCnyAmount,
  formatKrwAmount,
  formatSalesSettlementOrderRef,
  formatSettlementPaidDate,
  parseCnyExchangeRateInput,
  parseShipmentBoxCountInput,
  sumAvailableAmounts,
  type SalesSettlementRow,
} from '../../utils/shopSalesSettlement';
import { matchesLineDateRange } from '../../utils/shopOrderLineListUtils';
import { ShopOrderListPagination } from '../orders/ShopOrderListPagination';
import { SalesSettlementStatsPanel } from './SalesSettlementStatsPanel';

function formatProfitAmount(value: number | null): string {
  if (value == null) return '-';
  return formatKrwAmount(value);
}

function normalizeExchangeRateInput(input: string): string {
  return input.trim();
}

type SettlementPartner = 'wk' | 'inventio' | 'logistics';

function exchangeRateValueToSave(input: string): number | null {
  const normalized = normalizeExchangeRateInput(input);
  if (!normalized) return null;
  return parseCnyExchangeRateInput(normalized);
}

export function SalesSettlementPage() {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exchangeRateInputs, setExchangeRateInputs] = useState<Record<string, string>>({});
  const [savedExchangeRateInputs, setSavedExchangeRateInputs] = useState<Record<string, string>>({});
  const [shipmentBoxInputs, setShipmentBoxInputs] = useState<Record<string, string>>({});
  const [savedShipmentBoxInputs, setSavedShipmentBoxInputs] = useState<Record<string, string>>({});
  const [savingRowKeys, setSavingRowKeys] = useState<Record<string, boolean>>({});
  const [shipmentBoxSavingKeys, setShipmentBoxSavingKeys] = useState<Record<string, boolean>>({});
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const [shipmentBoxSaveErrors, setShipmentBoxSaveErrors] = useState<Record<string, string>>({});
  const [paymentSavingKeys, setPaymentSavingKeys] = useState<Record<string, boolean>>({});
  const [paymentSaveErrors, setPaymentSaveErrors] = useState<Record<string, string>>({});

  const exchangeRatesByRowKey = useMemo(() => {
    const rates: Record<string, number | null> = {};
    for (const [rowKey, input] of Object.entries(exchangeRateInputs)) {
      rates[rowKey] = parseCnyExchangeRateInput(input);
    }
    return rates;
  }, [exchangeRateInputs]);

  const shipmentBoxCountsByRowKey = useMemo(() => {
    const counts: Record<string, number | null> = {};
    for (const [rowKey, input] of Object.entries(shipmentBoxInputs)) {
      counts[rowKey] = parseShipmentBoxCountInput(input);
    }
    return counts;
  }, [shipmentBoxInputs]);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getShopOrders();
      setOrders(data);
      const inputs = buildExchangeRateInputsFromOrders(data);
      const shipmentInputs = buildShipmentBoxInputsFromOrders(data);
      setExchangeRateInputs(inputs);
      setSavedExchangeRateInputs(inputs);
      setShipmentBoxInputs(shipmentInputs);
      setSavedShipmentBoxInputs(shipmentInputs);
    } catch (err) {
      setError(err instanceof Error ? err.message : '주문 목록을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const settlementRows = useMemo(
    () => buildSalesSettlementRows(orders, exchangeRatesByRowKey, shipmentBoxCountsByRowKey),
    [orders, exchangeRatesByRowKey, shipmentBoxCountsByRowKey]
  );

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

  const {
    paginatedItems,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
  } = useShopOrderListPagination(filteredRows, paginationResetKey);

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

  const handleShipmentBoxChange = (rowKey: string, value: string) => {
    setShipmentBoxInputs((prev) => ({ ...prev, [rowKey]: value }));
    setShipmentBoxSaveErrors((prev) => {
      if (!(rowKey in prev)) return prev;
      const next = { ...prev };
      delete next[rowKey];
      return next;
    });
  };

  const saveShipmentBoxCount = useCallback(
    async (row: SalesSettlementRow) => {
      if (row.isLegacyLine) return;

      const input = shipmentBoxInputs[row.rowKey] ?? '';
      const normalizedInput = normalizeExchangeRateInput(input);
      const savedInput = savedShipmentBoxInputs[row.rowKey] ?? '';

      if (normalizedInput === savedInput.trim()) return;

      if (normalizedInput && parseShipmentBoxCountInput(normalizedInput) == null) {
        setShipmentBoxSaveErrors((prev) => ({
          ...prev,
          [row.rowKey]: '유효한 송장 박스수를 입력해 주세요.',
        }));
        return;
      }

      const valueToSave =
        normalizedInput === '' ? null : parseShipmentBoxCountInput(normalizedInput);

      setShipmentBoxSavingKeys((prev) => ({ ...prev, [row.rowKey]: true }));
      setShipmentBoxSaveErrors((prev) => {
        const next = { ...prev };
        delete next[row.rowKey];
        return next;
      });

      try {
        const updatedLine = await updateShopOrderLineShipmentBoxCount(
          row.shopOrderId,
          row.lineId,
          valueToSave
        );
        const savedValue =
          updatedLine.shipmentBoxCount != null ? String(updatedLine.shipmentBoxCount) : '';

        updateOrderLineInState(row.shopOrderId, row.lineId, {
          shipmentBoxCount: updatedLine.shipmentBoxCount,
        });
        setShipmentBoxInputs((prev) => ({ ...prev, [row.rowKey]: savedValue }));
        setSavedShipmentBoxInputs((prev) => ({ ...prev, [row.rowKey]: savedValue }));
      } catch (err) {
        setShipmentBoxSaveErrors((prev) => ({
          ...prev,
          [row.rowKey]:
            err instanceof Error ? err.message : '송장 박스수 저장에 실패했습니다.',
        }));
      } finally {
        setShipmentBoxSavingKeys((prev) => {
          const next = { ...prev };
          delete next[row.rowKey];
          return next;
        });
      }
    },
    [shipmentBoxInputs, savedShipmentBoxInputs]
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

  const updateOrderLineInState = (
    shopOrderId: string,
    lineId: string,
    patch: Partial<ShopOrder['lines'][number]>
  ) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id !== shopOrderId
          ? order
          : {
              ...order,
              lines: order.lines.map((line) =>
                line.id === lineId ? { ...line, ...patch } : line
              ),
            }
      )
    );
  };

  const handleSettlementPaidChange = useCallback(
    async (row: SalesSettlementRow, partner: SettlementPartner, checked: boolean) => {
      if (row.isLegacyLine) return;

      const savingKey = `${row.rowKey}:${partner}`;
      const previousPatch = {
        wkSettlementPaid: row.wkSettlementPaid,
        inventioSettlementPaid: row.inventioSettlementPaid,
        logisticsFeePaid: row.logisticsFeePaid,
        wkSettlementPaidAt: row.wkSettlementPaidAt,
        inventioSettlementPaidAt: row.inventioSettlementPaidAt,
        logisticsFeePaidAt: row.logisticsFeePaidAt,
      };

      const currentChecked =
        partner === 'wk'
          ? row.wkSettlementPaid
          : partner === 'inventio'
            ? row.inventioSettlementPaid
            : row.logisticsFeePaid;

      if (checked === currentChecked) return;

      const payload =
        partner === 'wk'
          ? { wkSettlementPaid: checked }
          : partner === 'inventio'
            ? { inventioSettlementPaid: checked }
            : { logisticsFeePaid: checked };

      setPaymentSavingKeys((prev) => ({ ...prev, [savingKey]: true }));
      setPaymentSaveErrors((prev) => {
        const next = { ...prev };
        delete next[savingKey];
        return next;
      });

      const optimisticPaidAt = checked ? new Date().toISOString() : null;
      updateOrderLineInState(row.shopOrderId, row.lineId, {
        ...payload,
        ...(partner === 'wk'
          ? { wkSettlementPaidAt: optimisticPaidAt }
          : partner === 'inventio'
            ? { inventioSettlementPaidAt: optimisticPaidAt }
            : { logisticsFeePaidAt: optimisticPaidAt }),
      });

      try {
        const updatedLine = await updateShopOrderLineSettlementPayment(
          row.shopOrderId,
          row.lineId,
          payload
        );
        updateOrderLineInState(row.shopOrderId, row.lineId, {
          wkSettlementPaid: updatedLine.wkSettlementPaid,
          inventioSettlementPaid: updatedLine.inventioSettlementPaid,
          logisticsFeePaid: updatedLine.logisticsFeePaid,
          wkSettlementPaidAt: updatedLine.wkSettlementPaidAt,
          inventioSettlementPaidAt: updatedLine.inventioSettlementPaidAt,
          logisticsFeePaidAt: updatedLine.logisticsFeePaidAt,
        });
      } catch (err) {
        updateOrderLineInState(row.shopOrderId, row.lineId, previousPatch);
        setPaymentSaveErrors((prev) => ({
          ...prev,
          [savingKey]:
            err instanceof Error ? err.message : '정산 지불 상태 저장에 실패했습니다.',
        }));
      } finally {
        setPaymentSavingKeys((prev) => {
          const next = { ...prev };
          delete next[savingKey];
          return next;
        });
      }
    },
    []
  );

  const pageTotals = useMemo(
    () => ({
      salesAmountExVat: sumAvailableAmounts(paginatedItems.map((row) => row.salesAmountExVat)),
      vatAmount: sumAvailableAmounts(paginatedItems.map((row) => row.vatAmount)),
      deliveryFee: sumAvailableAmounts(paginatedItems.map((row) => row.deliveryFee)),
      logisticsFee: paginatedItems.reduce((sum, row) => sum + row.logisticsFee, 0),
      costAmountKrw: sumAvailableAmounts(paginatedItems.map((row) => row.costAmountKrw)),
      profitAmount: sumAvailableAmounts(paginatedItems.map((row) => row.profitAmount)),
      wkProfitAmount: sumAvailableAmounts(paginatedItems.map((row) => row.wkProfitAmount)),
      inventioProfitAmount: sumAvailableAmounts(
        paginatedItems.map((row) => row.inventioProfitAmount)
      ),
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
          주문 건별로 위안 환율을 입력하면 판매 대금과 택배비에서 물류 수수료와 원가를 차감한
          최종 판매 이익을 WK 정산금(60%), 인벤티오 정산금(40%)으로 구분해 확인할 수 있습니다.
          입력한 환율과 지불 완료 상태는 자동 저장됩니다.
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
          {dateFilterActive || searchTerm ? ' (필터 적용됨)' : ''}
        </p>

        <p className="mt-3 text-xs text-gray-500">
          원가(₩) = 최종원가(¥/개) × 주문 수량 × 건별 환율 · 물류 수수료 = 송장 박스수 × 1,200원 ·
          최종 판매 이익 = 판매 대금 + 택배비 − 물류 수수료 − 원가(₩) · 파트너 이익 분배 = WK 60% /
          인벤티오 40%
        </p>

        <SalesSettlementStatsPanel rows={filteredRows} dateFilterActive={dateFilterActive} />
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
                    택배비
                  </th>
                  <th className="px-3 py-3 text-right font-medium text-gray-600 whitespace-nowrap">
                    송장 박스
                    <span className="block text-[10px] font-normal text-gray-400">저장</span>
                  </th>
                  <th className="px-3 py-3 text-right font-medium text-gray-600 whitespace-nowrap">
                    물류 수수료
                    <span className="block text-[10px] font-normal text-gray-400">박스×1,200 · 지급</span>
                  </th>
                  <th className="px-3 py-3 text-right font-medium text-gray-600 whitespace-nowrap">
                    원가(₩)
                    <span className="block text-[10px] font-normal text-gray-400">¥×수량×환율</span>
                  </th>
                  <th className="px-3 py-3 text-right font-medium text-gray-600 whitespace-nowrap">
                    최종 판매 이익
                  </th>
                  <th className="px-3 py-3 text-right font-medium text-gray-600 whitespace-nowrap">
                    WK 정산금
                    <span className="block text-[10px] font-normal text-blue-500">60%</span>
                  </th>
                  <th className="px-3 py-3 text-right font-medium text-gray-600 whitespace-nowrap">
                    인벤티오 정산금
                    <span className="block text-[10px] font-normal text-violet-500">40%</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="px-3 py-12 text-center text-gray-500">
                      표시할 주문 건이 없습니다.
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((row) => {
                    const isSaving = Boolean(savingRowKeys[row.rowKey]);
                    const saveError = saveErrors[row.rowKey];
                    const isShipmentBoxSaving = Boolean(shipmentBoxSavingKeys[row.rowKey]);
                    const shipmentBoxSaveError = shipmentBoxSaveErrors[row.rowKey];
                    const isDirty =
                      normalizeExchangeRateInput(exchangeRateInputs[row.rowKey] ?? '') !==
                      normalizeExchangeRateInput(savedExchangeRateInputs[row.rowKey] ?? '');
                    const isShipmentBoxDirty =
                      normalizeExchangeRateInput(shipmentBoxInputs[row.rowKey] ?? '') !==
                      normalizeExchangeRateInput(savedShipmentBoxInputs[row.rowKey] ?? '');

                    return (
                      <tr
                        key={row.rowKey}
                        className={row.isReservation ? 'hover:bg-amber-50/60 bg-amber-50/30' : 'hover:bg-gray-50'}
                      >
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
                        <td className="px-3 py-3 whitespace-nowrap text-gray-700 max-w-[120px] truncate">
                          {row.companyName || '-'}
                        </td>
                        <td className="px-3 py-3 text-gray-700 max-w-[160px] truncate" title={row.productName}>
                          {row.productName}
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
                          {formatKrwAmount(row.deliveryFee)}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-col items-end gap-0.5">
                            <div className="relative">
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={shipmentBoxInputs[row.rowKey] ?? ''}
                                onChange={(e) => handleShipmentBoxChange(row.rowKey, e.target.value)}
                                onBlur={() => void saveShipmentBoxCount(row)}
                                disabled={row.isLegacyLine || isShipmentBoxSaving}
                                placeholder="0"
                                aria-label={`${formatSalesSettlementOrderRef(row)} 송장 박스수`}
                                className={`w-[72px] px-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-right tabular-nums disabled:bg-gray-100 disabled:text-gray-500 ${
                                  shipmentBoxSaveError
                                    ? 'border-red-400'
                                    : isShipmentBoxDirty
                                      ? 'border-amber-400'
                                      : 'border-gray-300'
                                }`}
                              />
                              {isShipmentBoxSaving && (
                                <Loader2 className="absolute -right-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-purple-500" />
                              )}
                            </div>
                            {shipmentBoxSaveError && (
                              <span className="text-[10px] text-red-600 max-w-[72px] text-right leading-tight">
                                {shipmentBoxSaveError}
                              </span>
                            )}
                          </div>
                        </td>
                        <SettlementAmountCell
                          amount={row.logisticsFee}
                          amountClassName="text-gray-700"
                          checked={row.logisticsFeePaid}
                          paidAt={row.logisticsFeePaidAt}
                          disabled={
                            row.isLegacyLine ||
                            Boolean(paymentSavingKeys[`${row.rowKey}:logistics`])
                          }
                          isSaving={Boolean(paymentSavingKeys[`${row.rowKey}:logistics`])}
                          saveError={paymentSaveErrors[`${row.rowKey}:logistics`]}
                          checkboxLabel="지급완료"
                          label={`${formatSalesSettlementOrderRef(row)} 물류 수수료 지급완료`}
                          onCheckedChange={(checked) =>
                            void handleSettlementPaidChange(row, 'logistics', checked)
                          }
                        />
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
                        <SettlementAmountCell
                          amount={row.wkProfitAmount}
                          amountClassName={
                            row.wkProfitAmount == null
                              ? 'text-gray-400'
                              : row.wkProfitAmount < 0
                                ? 'text-red-600'
                                : 'text-blue-700'
                          }
                          checked={row.wkSettlementPaid}
                          paidAt={row.wkSettlementPaidAt}
                          disabled={
                            row.isLegacyLine ||
                            row.wkProfitAmount == null ||
                            Boolean(paymentSavingKeys[`${row.rowKey}:wk`])
                          }
                          isSaving={Boolean(paymentSavingKeys[`${row.rowKey}:wk`])}
                          saveError={paymentSaveErrors[`${row.rowKey}:wk`]}
                          label={`${formatSalesSettlementOrderRef(row)} WK 정산금 지급완료`}
                          checkboxLabel="지급완료"
                          onCheckedChange={(checked) =>
                            void handleSettlementPaidChange(row, 'wk', checked)
                          }
                        />
                        <SettlementAmountCell
                          amount={row.inventioProfitAmount}
                          amountClassName={
                            row.inventioProfitAmount == null
                              ? 'text-gray-400'
                              : row.inventioProfitAmount < 0
                                ? 'text-red-600'
                                : 'text-violet-700'
                          }
                          checked={row.inventioSettlementPaid}
                          paidAt={row.inventioSettlementPaidAt}
                          disabled={
                            row.isLegacyLine ||
                            row.inventioProfitAmount == null ||
                            Boolean(paymentSavingKeys[`${row.rowKey}:inventio`])
                          }
                          isSaving={Boolean(paymentSavingKeys[`${row.rowKey}:inventio`])}
                          saveError={paymentSaveErrors[`${row.rowKey}:inventio`]}
                          label={`${formatSalesSettlementOrderRef(row)} 인벤티오 정산금 지급완료`}
                          checkboxLabel="지급완료"
                          onCheckedChange={(checked) =>
                            void handleSettlementPaidChange(row, 'inventio', checked)
                          }
                        />
                      </tr>
                    );
                  })
                )}
              </tbody>
              {paginatedItems.length > 0 && (
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={8} className="px-3 py-3 text-right font-medium text-gray-700">
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
                      {formatKrwAmount(pageTotals.deliveryFee)}
                    </td>
                    <td className="px-3 py-3" />
                    <SettlementFooterAmountCell
                      amount={formatKrwAmount(pageTotals.logisticsFee)}
                      className="font-medium text-gray-700"
                    />
                    <td className="px-3 py-3 text-right tabular-nums font-medium text-gray-700">
                      {formatKrwAmount(pageTotals.costAmountKrw)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold text-emerald-700">
                      {formatProfitAmount(
                        pageTotals.calculatedCount > 0 ? pageTotals.profitAmount : null
                      )}
                    </td>
                    <SettlementFooterAmountCell
                      amount={formatProfitAmount(
                        pageTotals.calculatedCount > 0 ? pageTotals.wkProfitAmount : null
                      )}
                      className="font-semibold text-blue-700"
                    />
                    <SettlementFooterAmountCell
                      amount={formatProfitAmount(
                        pageTotals.calculatedCount > 0 ? pageTotals.inventioProfitAmount : null
                      )}
                      className="font-semibold text-violet-700"
                    />
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
    </div>
  );
}

function SettlementFooterAmountCell({
  amount,
  className,
}: {
  amount: string;
  className: string;
}) {
  return (
    <td className="px-3 py-3">
      <div className="flex flex-col items-end min-w-[140px]">
        <div className="flex items-center justify-end gap-2 w-full">
          <span className={`tabular-nums ${className}`}>{amount}</span>
          <span className="inline-flex items-center gap-1 shrink-0 invisible" aria-hidden="true">
            <span className="h-3.5 w-3.5" />
            <span className="text-[10px] whitespace-nowrap">지급완료</span>
          </span>
        </div>
      </div>
    </td>
  );
}

function SettlementAmountCell({
  amount,
  amountClassName,
  checked,
  paidAt,
  disabled,
  isSaving,
  saveError,
  label,
  checkboxLabel = '지급완료',
  onCheckedChange,
}: {
  amount: number | null;
  amountClassName: string;
  checked: boolean;
  paidAt?: string | null;
  disabled: boolean;
  isSaving: boolean;
  saveError?: string;
  label: string;
  checkboxLabel?: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  const paidDateLabel = checked ? formatSettlementPaidDate(paidAt) : null;

  return (
    <td className="px-3 py-3">
      <div className="flex flex-col items-end gap-1 min-w-[140px]">
        <div className="flex items-center justify-end gap-2 w-full">
          <span className={`tabular-nums font-medium ${amountClassName}`}>
            {formatProfitAmount(amount)}
          </span>
          <label
            className={`inline-flex items-center gap-1 shrink-0 ${
              disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
            }`}
            title={label}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={(e) => onCheckedChange(e.target.checked)}
              aria-label={label}
              className="h-3.5 w-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:cursor-not-allowed"
            />
            <span className="text-[10px] text-gray-500 whitespace-nowrap">{checkboxLabel}</span>
            {isSaving && <Loader2 className="w-3 h-3 animate-spin text-purple-500" />}
          </label>
        </div>
        {paidDateLabel && (
          <span className="text-[10px] text-gray-500 tabular-nums">{paidDateLabel}</span>
        )}
        {saveError && (
          <span className="text-[10px] text-red-600 text-right leading-tight max-w-full">
            {saveError}
          </span>
        )}
      </div>
    </td>
  );
}
