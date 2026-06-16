import {
  buildSalesSettlementStatsByDate,
  calculateSalesSettlementAggregateStats,
  formatKrwAmount,
  type SalesSettlementAggregateStats,
  type SalesSettlementRow,
  type SettlementPaymentTotals,
} from '../../utils/shopSalesSettlement';

interface SalesSettlementStatsPanelProps {
  rows: SalesSettlementRow[];
  dateFilterActive: boolean;
  selectionLabel?: string | null;
}

export function SalesSettlementStatsPanel({
  rows,
  dateFilterActive,
  selectionLabel = null,
}: SalesSettlementStatsPanelProps) {
  const viewMode = dateFilterActive ? 'by-date' : 'total';
  const totalStats = calculateSalesSettlementAggregateStats(rows);
  const dateStats = buildSalesSettlementStatsByDate(rows);

  return (
    <div className="mt-3">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-gray-900">정산 통계</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {selectionLabel ?? `${rows.length.toLocaleString()}건 기준`} ·{' '}
          {viewMode === 'by-date'
            ? '등록일 필터 적용 · 날짜별 집계'
            : selectionLabel
              ? '선택 건 집계'
              : '전체 합계'}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center border border-dashed border-gray-200 rounded-lg">
          통계를 표시할 주문 건이 없습니다.
        </p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2.5 text-left font-medium text-gray-600 whitespace-nowrap">
                  {viewMode === 'by-date' ? '등록일' : '구분'}
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-gray-600 whitespace-nowrap">
                  건수
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-gray-600 whitespace-nowrap">
                  주문 수량
                  <span className="block text-[10px] font-normal text-gray-400">개</span>
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-gray-600 whitespace-nowrap">
                  주문 박스
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-gray-600 whitespace-nowrap">
                  판매 대금
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-gray-600 whitespace-nowrap">
                  VAT
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-gray-600 whitespace-nowrap min-w-[168px]">
                  물류 수수료
                  <span className="block text-[10px] font-normal text-gray-400">지급 / 미지급</span>
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-gray-600 whitespace-nowrap">
                  최종 판매 이익
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-gray-600 whitespace-nowrap min-w-[168px]">
                  WK 정산금
                  <span className="block text-[10px] font-normal text-blue-500">지급 / 미지급</span>
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-gray-600 whitespace-nowrap min-w-[168px]">
                  인벤티오 정산금
                  <span className="block text-[10px] font-normal text-violet-500">지급 / 미지급</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {viewMode === 'by-date' ? (
                dateStats.map((stats) => (
                  <StatsTableRow key={stats.dateKey} label={stats.dateKey} stats={stats} />
                ))
              ) : (
                <StatsTableRow label="전체" stats={totalStats} />
              )}
            </tbody>
            {viewMode === 'by-date' && dateStats.length > 1 && (
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <StatsTableRow label="합계" stats={totalStats} isFooter />
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}

function StatsTableRow({
  label,
  stats,
  isFooter = false,
}: {
  label: string;
  stats: SalesSettlementAggregateStats;
  isFooter?: boolean;
}) {
  const rowClass = isFooter ? 'font-semibold' : '';
  const labelCellClass = isFooter ? 'text-gray-900' : 'text-gray-700';

  return (
    <tr className={isFooter ? 'bg-gray-50' : 'hover:bg-gray-50/60'}>
      <td className={`px-3 py-2.5 whitespace-nowrap ${labelCellClass} ${rowClass}`}>{label}</td>
      <td className={`px-3 py-2.5 text-right tabular-nums text-gray-700 ${rowClass}`}>
        {stats.rowCount.toLocaleString()}
      </td>
      <td className={`px-3 py-2.5 text-right tabular-nums text-gray-900 ${rowClass}`}>
        {stats.orderQuantityTotal.toLocaleString()}
      </td>
      <td className={`px-3 py-2.5 text-right tabular-nums text-gray-700 ${rowClass}`}>
        {stats.orderBoxCountTotal.toLocaleString()}
      </td>
      <td className={`px-3 py-2.5 text-right tabular-nums text-gray-900 ${rowClass}`}>
        {formatKrwAmount(stats.salesAmountExVat)}
      </td>
      <td className={`px-3 py-2.5 text-right tabular-nums text-gray-600 ${rowClass}`}>
        {formatKrwAmount(stats.vatAmount)}
      </td>
      <td className={`px-3 py-2.5 ${rowClass}`}>
        <PaymentBreakdownCell
          total={stats.logisticsFeeTotal}
          payment={stats.logisticsPayment}
          totalClassName="text-gray-900"
          paidClassName="text-emerald-700"
          unpaidClassName="text-amber-700"
        />
      </td>
      <td className={`px-3 py-2.5 text-right tabular-nums text-emerald-700 ${rowClass}`}>
        {stats.profitCalculatedCount > 0 ? formatKrwAmount(stats.profitAmount) : '-'}
        {!isFooter && stats.profitCalculatedCount > 0 && stats.profitCalculatedCount < stats.rowCount && (
          <span className="block text-[10px] font-normal text-gray-400">
            ({stats.profitCalculatedCount}건 산출)
          </span>
        )}
      </td>
      <td className={`px-3 py-2.5 ${rowClass}`}>
        <PaymentBreakdownCell
          total={stats.wkPayment.paidAmount + stats.wkPayment.unpaidAmount}
          payment={stats.wkPayment}
          totalClassName="text-blue-700"
          paidClassName="text-emerald-700"
          unpaidClassName="text-amber-700"
        />
      </td>
      <td className={`px-3 py-2.5 ${rowClass}`}>
        <PaymentBreakdownCell
          total={stats.inventioPayment.paidAmount + stats.inventioPayment.unpaidAmount}
          payment={stats.inventioPayment}
          totalClassName="text-violet-700"
          paidClassName="text-emerald-700"
          unpaidClassName="text-amber-700"
        />
      </td>
    </tr>
  );
}

function PaymentBreakdownCell({
  total,
  payment,
  totalClassName,
  paidClassName,
  unpaidClassName,
}: {
  total: number;
  payment: SettlementPaymentTotals;
  totalClassName: string;
  paidClassName: string;
  unpaidClassName: string;
}) {
  const hasEligibleRows = payment.paidCount + payment.unpaidCount > 0;

  return (
    <div className="flex flex-col items-end gap-0.5 min-w-[148px]">
      <span className={`tabular-nums font-medium ${totalClassName}`}>
        {hasEligibleRows ? formatKrwAmount(total) : '-'}
      </span>
      {hasEligibleRows && (
        <>
          <span className={`text-[10px] tabular-nums ${paidClassName}`}>
            지급 {formatKrwAmount(payment.paidAmount)} ({payment.paidCount}건)
          </span>
          <span className={`text-[10px] tabular-nums ${unpaidClassName}`}>
            미지급 {formatKrwAmount(payment.unpaidAmount)} ({payment.unpaidCount}건)
          </span>
        </>
      )}
    </div>
  );
}
