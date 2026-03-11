import { useState, useCallback } from 'react';
import { getCostAnalysis } from '../../api/purchaseOrderApi';
import { getLocalDateString } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { DateRangeFilter } from './DateRangeFilter';
import { CostSummaryCard } from './CostSummaryCard';
import { Loader2, AlertCircle, Calculator } from 'lucide-react';

/** 이번 달 1일 YYYY-MM-DD */
function getFirstDayOfMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function CostAnalysis() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getLocalDateString());
  const [data, setData] = useState<{
    totalOrderAmount: number;
    totalCommissionAmount: number;
    totalAdminCost: number;
    orderCount: number;
    totalQuantity: number;
    items: Array<{
      id: string;
      po_number: string;
      order_date: string | null;
      product_name: string;
      quantity: number;
      totalOrderAmount: number;
      commissionAmount: number;
      adminCost: number;
    }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (startDate > endDate) {
      setError('시작일은 종료일 이전이어야 합니다.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setData(null);
    try {
      const result = await getCostAnalysis(startDate, endDate, {
        ...(user?.id && { 'X-User-Id': user.id }),
      });
      setData(result);
    } catch (err: any) {
      setError(err.message || '비용 분석 조회에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center gap-2">
        <Calculator className="w-6 h-6 text-purple-600" />
        <h1 className="text-xl font-semibold text-gray-900">비용 분석</h1>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        발주 목록의 <strong>발주일(order_date)</strong> 기준으로 기간을 지정한 뒤, 해당 기간 내 발주의 총 금액·수수료·A레벨 비용을 확인할 수 있습니다.
      </p>

      <div className="flex flex-wrap items-end gap-3 mb-6">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          disabled={isLoading}
          startLabel="시작일"
          endLabel="종료일"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={isLoading}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : null}
          분석 조회
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            조회 기간: {startDate} ~ {endDate} · 발주 건수: {data.orderCount}건 · 발주 총 수량: {new Intl.NumberFormat('ko-KR').format(data.totalQuantity)}개
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <CostSummaryCard
              label="발주 총 금액"
              value={data.totalOrderAmount}
              format="currency"
            />
            <CostSummaryCard
              label="수수료 금액"
              value={data.totalCommissionAmount}
              format="currency"
            />
            <CostSummaryCard
              label="A레벨 비용"
              value={data.totalAdminCost}
              format="currency"
            />
            <CostSummaryCard
              label="발주 총 수량 (개)"
              value={data.totalQuantity}
              format="number"
            />
          </div>

          <section className="mt-8 rounded-xl border border-gray-200 bg-gray-50/50 p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-3">분석근거</h2>
            <p className="text-sm text-gray-600 mb-4">
              <strong>발주 총 금액</strong> = 해당 기간 발주의 최종 결제 금액 합계(기본비용+수수료+배송비+옵션·인건비).{' '}
              <strong>수수료 금액</strong> = 각 발주의 수수료 합계. <strong>A레벨 비용</strong> = 각 발주의 발주 주가비(추가단가×수량) + A레벨 전용 비용 항목 합계. (결제내역의 A레벨 관리자 추가 비용과 동일한 계산식, 패킹리스트 배송비 차이는 발주일 기준 비용분석에 미포함) <strong>발주 총 수량</strong> = 해당 기간 발주 수량 합계.
              아래 표는 조회 기간 내 발주일 기준 포함된 발주 목록이며, 각 행의 합계가 위 카드와 일치합니다.
            </p>
            <p className="text-xs text-gray-500 mb-4">
              2025-01-06 이전 발주는 수수료가 기본비용에 포함되어 계산되며, 이후 발주는 수수료를 별도 합산합니다.
            </p>

            {(!data.items || data.items.length === 0) ? (
              <p className="text-sm text-gray-500">해당 기간에 포함된 발주가 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 font-medium text-gray-700">발주번호</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-700">발주일</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-700">상품명</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-700">수량</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-700">발주 총액</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-700">수수료</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-700">A레벨 비용</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.items ?? []).map((row) => (
                      <tr key={row.id} className="border-b border-gray-100 hover:bg-white/60">
                        <td className="py-2 px-2 text-gray-900">{row.po_number}</td>
                        <td className="py-2 px-2 text-gray-600">{row.order_date ?? '-'}</td>
                        <td className="py-2 px-2 text-gray-900 max-w-[200px] truncate" title={row.product_name}>{row.product_name}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{row.quantity}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{formatCurrency(row.totalOrderAmount)}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{formatCurrency(row.commissionAmount)}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{formatCurrency(row.adminCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 bg-white/80 font-medium">
                      <td className="py-2 px-2" colSpan={3}>합계</td>
                      <td className="py-2 px-2 text-right tabular-nums">{new Intl.NumberFormat('ko-KR').format(data.totalQuantity)}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{formatCurrency(data.totalOrderAmount)}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{formatCurrency(data.totalCommissionAmount)}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{formatCurrency(data.totalAdminCost)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {!data && !error && !isLoading && (
        <p className="text-sm text-gray-500">기간을 선택한 뒤 「분석 조회」를 눌러 주세요.</p>
      )}
    </div>
  );
}
