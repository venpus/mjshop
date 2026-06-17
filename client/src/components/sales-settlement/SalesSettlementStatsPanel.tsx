import { useState, type ReactNode } from 'react';
import {
  buildSalesSettlementStatsByDate,
  calculateSalesSettlementAggregateStats,
  formatKrwAmount,
  type PartnerLedgerTotals,
  type SalesSettlementAggregateStats,
  type SalesSettlementRow,
  type SettlementPaymentTotals,
} from '../../utils/shopSalesSettlement';
import { shopShippingManagementPath } from '../../utils/shopLineShipmentUtils';
import { useNavigate } from 'react-router-dom';
import {
  SalesSettlementLedgerIconButton,
  SalesSettlementPartnerLedgerModal,
} from './SalesSettlementPartnerLedgerModal';
import type { SalesSettlementLedgerPartner } from '../../api/shopSalesSettlementLedgerApi';

interface SalesSettlementStatsPanelProps {
  rows: SalesSettlementRow[];
  lineBatchPaidMap: Map<string, boolean>;
  ledgerTotals: PartnerLedgerTotals;
  dateFilterActive: boolean;
  selectionLabel?: ReactNode | null;
  onLedgerChanged: () => void;
}

export function SalesSettlementStatsPanel({
  rows,
  lineBatchPaidMap,
  ledgerTotals,
  dateFilterActive,
  selectionLabel = null,
  onLedgerChanged,
}: SalesSettlementStatsPanelProps) {
  const [ledgerModalPartner, setLedgerModalPartner] = useState<SalesSettlementLedgerPartner | null>(
    null
  );
  const viewMode = dateFilterActive ? 'by-date' : 'total';
  const totalStats = calculateSalesSettlementAggregateStats(rows, lineBatchPaidMap, ledgerTotals);
  const dateStats = buildSalesSettlementStatsByDate(rows, lineBatchPaidMap, ledgerTotals);

  const openLedgerModal = (partner: SalesSettlementLedgerPartner) => {
    setLedgerModalPartner(partner);
  };

  return (
    <div className="mt-3">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-gray-900">정산 통계</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {selectionLabel ?? (
            <>
              <span>판매 {totalStats.rowCount.toLocaleString()}건</span>
              <span className="mx-1.5 text-gray-300">·</span>
              <span className="font-semibold text-gray-800">
                {totalStats.orderQuantityTotal.toLocaleString()}개
              </span>
            </>
          )}{' '}
          ·{' '}
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
        <>
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
                    판매 수량
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-gray-600 whitespace-nowrap">
                    판매 대금
                    <span className="block text-[10px] font-normal text-gray-400">VAT 미포함</span>
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-gray-600 whitespace-nowrap">
                    판매 원가
                    <span className="block text-[10px] font-normal text-gray-400">¥×수량×환율</span>
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-gray-600 whitespace-nowrap min-w-[168px]">
                    물류 수수료
                    <span className="block text-[10px] font-normal text-gray-400">
                      박스×1,200+택배+박스가 · 지급/미지급
                    </span>
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-gray-600 whitespace-nowrap">
                    최종 판매 이익
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-gray-600 whitespace-nowrap min-w-[168px]">
                    WK 정산금
                    <span className="block text-[10px] font-normal text-blue-500">60% · 지급/미지급</span>
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-gray-600 whitespace-nowrap min-w-[168px]">
                    인벤티오 정산금
                    <span className="block text-[10px] font-normal text-violet-500">40% · 지급/미지급</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {viewMode === 'by-date' ? (
                  dateStats.map((stats) => (
                    <StatsTableRow
                      key={stats.dateKey}
                      label={stats.dateKey}
                      stats={stats}
                      onOpenLedger={openLedgerModal}
                    />
                  ))
                ) : (
                  <StatsTableRow label="전체" stats={totalStats} onOpenLedger={openLedgerModal} />
                )}
              </tbody>
              {viewMode === 'by-date' && dateStats.length > 1 && (
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <StatsTableRow
                    label="합계"
                    stats={totalStats}
                    isFooter
                    onOpenLedger={openLedgerModal}
                  />
                </tfoot>
              )}
            </table>
          </div>

          {ledgerModalPartner && (
            <SalesSettlementPartnerLedgerModal
              partner={ledgerModalPartner}
              isOpen
              onClose={() => setLedgerModalPartner(null)}
              grossAmount={
                ledgerModalPartner === 'wk'
                  ? totalStats.wkPayment.paidAmount + totalStats.wkPayment.unpaidAmount
                  : totalStats.inventioPayment.paidAmount + totalStats.inventioPayment.unpaidAmount
              }
              onChanged={onLedgerChanged}
            />
          )}
        </>
      )}
    </div>
  );
}

function SalesAmountBreakdownCell({
  stats,
  rowClass = '',
}: {
  stats: SalesSettlementAggregateStats;
  rowClass?: string;
}) {
  const showRegular = stats.regularOrderSalesAmountExVat > 0;
  const showReservation = stats.reservationOrderSalesAmountExVat > 0;

  return (
    <div className={`flex flex-col items-end gap-0.5 ${rowClass}`}>
      <span className="tabular-nums font-medium text-gray-900">
        {formatKrwAmount(stats.salesAmountExVat)}
      </span>
      {(showRegular || showReservation) && (
        <>
          {showRegular && (
            <span className="text-[10px] tabular-nums font-normal text-emerald-700">
              일반 {formatKrwAmount(stats.regularOrderSalesAmountExVat)}
            </span>
          )}
          {showReservation && (
            <span className="text-[10px] tabular-nums font-normal text-amber-700">
              예약 {formatKrwAmount(stats.reservationOrderSalesAmountExVat)}
            </span>
          )}
        </>
      )}
    </div>
  );
}

function StatsTableRow({
  label,
  stats,
  isFooter = false,
  onOpenLedger,
}: {
  label: string;
  stats: SalesSettlementAggregateStats;
  isFooter?: boolean;
  onOpenLedger: (partner: SalesSettlementLedgerPartner) => void;
}) {
  const navigate = useNavigate();
  const rowClass = isFooter ? 'font-semibold' : '';
  const labelCellClass = isFooter ? 'text-gray-900' : 'text-gray-700';

  return (
    <tr className={isFooter ? 'bg-gray-50' : 'hover:bg-gray-50/60'}>
      <td className={`px-3 py-2.5 whitespace-nowrap ${labelCellClass} ${rowClass}`}>{label}</td>
      <td className={`px-3 py-2.5 text-right tabular-nums text-gray-700 ${rowClass}`}>
        {stats.rowCount.toLocaleString()}건
      </td>
      <td className={`px-3 py-2.5 text-right tabular-nums text-gray-900 ${rowClass}`}>
        <span className="text-base font-bold">{stats.orderQuantityTotal.toLocaleString()}</span>
        <span className="text-xs font-medium text-gray-500 ml-0.5">개</span>
      </td>
      <td className={`px-3 py-2.5 text-right ${rowClass}`}>
        <SalesAmountBreakdownCell stats={stats} />
      </td>
      <td className={`px-3 py-2.5 text-right tabular-nums text-orange-800 ${rowClass}`}>
        {stats.costCalculatedCount > 0 ? formatKrwAmount(stats.costAmountKrw) : '-'}
        {!isFooter && stats.costCalculatedCount > 0 && stats.costCalculatedCount < stats.rowCount && (
          <span className="block text-[10px] font-normal text-gray-400">
            ({stats.costCalculatedCount}건 산출)
          </span>
        )}
      </td>
      <td className={`px-3 py-2.5 ${rowClass}`}>
        <PaymentBreakdownCell
          total={stats.logisticsFeeTotal}
          payment={stats.logisticsPayment}
          totalClassName="text-gray-900"
          paidClassName="text-emerald-700"
          unpaidClassName="text-amber-700"
          onClick={() => navigate(shopShippingManagementPath())}
          clickTitle="배송관리에서 물류 수수료 확인"
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
        <PartnerPaymentBreakdownCell
          payment={stats.wkPayment}
          totalClassName="text-blue-700"
          paidClassName="text-emerald-700"
          unpaidClassName="text-amber-700"
          tone="wk"
          onOpenLedger={() => onOpenLedger('wk')}
        />
      </td>
      <td className={`px-3 py-2.5 ${rowClass}`}>
        <PartnerPaymentBreakdownCell
          payment={stats.inventioPayment}
          totalClassName="text-violet-700"
          paidClassName="text-emerald-700"
          unpaidClassName="text-amber-700"
          tone="inventio"
          onOpenLedger={() => onOpenLedger('inventio')}
        />
      </td>
    </tr>
  );
}

function PartnerPaymentBreakdownCell({
  payment,
  totalClassName,
  paidClassName,
  unpaidClassName,
  tone,
  onOpenLedger,
}: {
  payment: SettlementPaymentTotals;
  totalClassName: string;
  paidClassName: string;
  unpaidClassName: string;
  tone: 'wk' | 'inventio';
  onOpenLedger: () => void;
}) {
  const gross = payment.paidAmount + payment.unpaidAmount;
  const net = payment.unpaidAmount;
  const hasEligibleRows = payment.unpaidCount > 0 || payment.paidCount > 0;

  return (
    <div className="flex items-start justify-end gap-0.5 min-w-[168px]">
      <div className="flex flex-col items-end gap-0.5">
        <span className={`tabular-nums font-medium ${totalClassName}`}>
          {hasEligibleRows ? formatKrwAmount(net) : '-'}
        </span>
        {hasEligibleRows && (
          <>
            <span className={`text-[10px] tabular-nums ${paidClassName}`}>
              장부 {formatKrwAmount(payment.paidAmount)} ({payment.paidCount}건)
            </span>
            <span className={`text-[10px] tabular-nums text-gray-500`}>
              발생 {formatKrwAmount(gross)} ({payment.unpaidCount}건)
            </span>
            {net < 0 && (
              <span className={`text-[10px] tabular-nums ${unpaidClassName}`}>
                초과 {formatKrwAmount(Math.abs(net))}
              </span>
            )}
          </>
        )}
      </div>
      <SalesSettlementLedgerIconButton
        tone={tone}
        title={tone === 'wk' ? 'WK 정산 장부' : '인벤티오 정산 장부'}
        onClick={onOpenLedger}
      />
    </div>
  );
}

function PaymentBreakdownCell({
  total,
  payment,
  totalClassName,
  paidClassName,
  unpaidClassName,
  onClick,
  clickTitle,
}: {
  total: number;
  payment: SettlementPaymentTotals;
  totalClassName: string;
  paidClassName: string;
  unpaidClassName: string;
  onClick?: () => void;
  clickTitle?: string;
}) {
  const hasEligibleRows = payment.paidCount + payment.unpaidCount > 0;

  const content = (
    <>
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
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        title={clickTitle}
        onClick={onClick}
        className="flex flex-col items-end gap-0.5 min-w-[148px] w-full text-right rounded-md px-1 py-0.5 -mx-1 hover:bg-sky-50 transition-colors cursor-pointer"
      >
        {content}
      </button>
    );
  }

  return <div className="flex flex-col items-end gap-0.5 min-w-[148px]">{content}</div>;
}
