import { useState, useEffect, useCallback } from 'react';
import { getNotArrivedAnalysis, NotArrivedAnalysis as NotArrivedAnalysisType } from '../api/purchaseOrderApi';
import { Loader2, AlertCircle, RefreshCw, TrendingUp, Download, Search } from 'lucide-react';
import { exportNotArrivedAnalysisToExcel } from '../utils/excelExport';
import { summarizeNotArrivedItems } from '../utils/notArrivedAnalysisUtils';
import { DateRangeFilter } from './cost-analysis/DateRangeFilter';
import { NotArrivedItemsTable } from './not-arrived-analysis/NotArrivedItemsTable';

export function NotArrivedAnalysis() {
  const [data, setData] = useState<NotArrivedAnalysisType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    const s = startDate.trim();
    const e = endDate.trim();
    if (s && e && s > e) {
      setError('시작일은 종료일 이전이어야 합니다.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await getNotArrivedAnalysis({
        ...(s ? { startDate: s } : {}),
        ...(e ? { endDate: e } : {}),
      });
      setData(result);
      setSelectedIds(new Set());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.';
      setError(message);
      console.error('분석 데이터 조회 오류:', err);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    void loadData();
    // 초기 1회만 조회. 날짜 변경 후에는「조회」또는「새로고침」으로 갱신합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num);
  };

  const handleSearch = () => {
    void loadData();
  };

  const handleExportSelectedToExcel = async () => {
    if (!data || data.items.length === 0) {
      alert('보낼 데이터가 없습니다.');
      return;
    }
    if (selectedIds.size === 0) {
      alert('엑셀로보낼 행을 체크해 주세요.');
      return;
    }

    const selectedItems = data.items.filter((item) => selectedIds.has(item.id));
    if (selectedItems.length === 0) {
      alert('선택한 항목이 현재 목록에 없습니다. 다시 조회 후 선택해 주세요.');
      return;
    }

    setIsExporting(true);
    try {
      const summary = summarizeNotArrivedItems(selectedItems);
      await exportNotArrivedAnalysisToExcel(selectedItems, summary);
    } catch (err: unknown) {
      console.error('엑셀보내기 오류:', err);
      const message = err instanceof Error ? err.message : '알 수 없는 오류';
      alert('엑셀보내기에 실패했습니다: ' + message);
    } finally {
      setIsExporting(false);
    }
  };

  const items = data?.items ?? [];
  const allSelected = items.length > 0 && items.every((item) => selectedIds.has(item.id));

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleAll = () => {
    setSelectedIds((prev) => {
      if (items.length === 0) return new Set();
      if (items.every((item) => prev.has(item.id))) return new Set();
      return new Set(items.map((item) => item.id));
    });
  };

  if (isLoading && !data) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-gray-600">데이터를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-semibold text-red-800">오류 발생</h3>
          </div>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">한국 미도착 물품 분석</h1>
          <p className="text-gray-600">
            한국에 도착하지 않은 물품들의 납기일, 수량, 단가, 총금액을 분석합니다. 발주일 범위를 지정하면 해당 구간만 조회합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void handleExportSelectedToExcel()}
            disabled={isExporting || isLoading || items.length === 0 || selectedIds.size === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                보내는 중...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                선택 항목 엑셀
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-gray-50/80 p-4">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          disabled={isLoading}
          startLabel="발주 시작일"
          endLabel="발주 종료일"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={isLoading}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          조회
        </button>
        <p className="text-xs text-gray-500 w-full sm:w-auto sm:ml-2">
          날짜를 비우면 전체 기간(미도착 조건 만족 분)을 조회합니다.
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div>
      ) : null}

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">전체 수량 합계</span>
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(data.summary.total_quantity)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">전체 금액 합계</span>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.summary.total_amount)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">미도착 수량 합계</span>
            <TrendingUp className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(data.summary.not_arrived_quantity)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">미도착 금액 합계</span>
            <TrendingUp className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.summary.not_arrived_amount)}</p>
        </div>
      </div>

      {/* 상세 목록 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">미도착 물품 목록</h2>
          <p className="text-sm text-gray-600 mt-1">
            총 {items.length}건 · 선택 {selectedIds.size}건
          </p>
        </div>
        <NotArrivedItemsTable
          items={items}
          selectedIds={selectedIds}
          onToggleRow={handleToggleRow}
          onToggleAll={handleToggleAll}
          allSelected={allSelected}
          formatCurrency={formatCurrency}
          formatNumber={formatNumber}
        />
      </div>
    </div>
  );
}
