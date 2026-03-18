import React, { useState, useEffect } from 'react';
import {
  getPaymentHistory,
  PaymentHistoryItem,
} from '../../api/paymentHistoryApi';
import { getAllPaymentRequests } from '../../api/paymentRequestApi';
import { useLanguage } from '../../contexts/LanguageContext';
import { AdminCostStatCard } from './AdminCostStatCard';
import {
  aggregateAdminCostByPaymentBucket,
  collectAdminCostConfirmedItems,
  emptyAdminCostDetail,
  type AdminCostDetail,
  type AdminCostConfirmedRow,
} from '../../utils/adminCostStatistics';
import { AdminCostConfirmedModal } from './AdminCostConfirmedModal';
import { FactoryCostRequestCard } from './FactoryCostRequestCard';

interface PaymentDetail {
  advance: number;
  balance: number;
  shipping: number;
}

interface PaymentStatistics {
  paidAmount: number;
  pendingAmount: number;
  requestedAmount: number;
  paidDetail: PaymentDetail;
  pendingDetail: PaymentDetail;
  requestedDetail: PaymentDetail;
  adminCostTotal: number;
  adminCostDetail: AdminCostDetail;
  adminCostPending: number;
  adminCostPendingDetail: AdminCostDetail;
  adminCostConfirmed: number;
  adminCostConfirmedDetail: AdminCostDetail;
  adminCostPaid: number;
  adminCostPaidDetail: AdminCostDetail;
}

interface PaymentStatisticsCardsProps {
  refreshTrigger?: number;
  userLevel?: 'A-SuperAdmin' | 'S: Admin' | 'B0: 중국Admin' | 'C0: 한국Admin' | 'D0: 비전 담당자';
  /** 비-A0 한국Admin 전용: 금일 지급요청 카드 오른쪽 공장 비용 카드 */
  factoryCostRequestTotalCny?: number;
  factoryCostRequestLoading?: boolean;
  onFactoryCostRequestCardClick?: () => void;
}

const ADMIN_COST_FROM_DATE = '2026-02-22';

function isOnOrAfterAdminCostFromDate(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const d = String(dateStr).slice(0, 10);
  return d >= ADMIN_COST_FROM_DATE;
}

export function PaymentStatisticsCards({
  refreshTrigger,
  userLevel,
  factoryCostRequestTotalCny = 0,
  factoryCostRequestLoading = false,
  onFactoryCostRequestCardClick,
}: PaymentStatisticsCardsProps) {
  const { t } = useLanguage();
  const isLevelC = userLevel === 'C0: 한국Admin';
  const [statistics, setStatistics] = useState<PaymentStatistics>({
    paidAmount: 0,
    pendingAmount: 0,
    requestedAmount: 0,
    paidDetail: { advance: 0, balance: 0, shipping: 0 },
    pendingDetail: { advance: 0, balance: 0, shipping: 0 },
    requestedDetail: { advance: 0, balance: 0, shipping: 0 },
    adminCostTotal: 0,
    adminCostDetail: emptyAdminCostDetail(),
    adminCostPending: 0,
    adminCostPendingDetail: emptyAdminCostDetail(),
    adminCostConfirmed: 0,
    adminCostConfirmedDetail: emptyAdminCostDetail(),
    adminCostPaid: 0,
    adminCostPaidDetail: emptyAdminCostDetail(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [confirmedModalOpen, setConfirmedModalOpen] = useState(false);
  const [confirmedPoRows, setConfirmedPoRows] = useState<AdminCostConfirmedRow[]>([]);
  const [confirmedPlRows, setConfirmedPlRows] = useState<AdminCostConfirmedRow[]>([]);

  useEffect(() => {
    loadStatistics();
  }, [refreshTrigger]);

  const loadStatistics = async () => {
    setIsLoading(true);
    try {
      const [poHistory, plHistory, allRequests] = await Promise.all([
        getPaymentHistory({ type: 'purchase-orders' }),
        getPaymentHistory({ type: 'packing-lists' }),
        getAllPaymentRequests(),
      ]);

      const allHistory: PaymentHistoryItem[] = [...poHistory, ...plHistory];

      let paidAmount = 0;
      const paidDetail: PaymentDetail = { advance: 0, balance: 0, shipping: 0 };

      allHistory
        .filter((item) => item.source_type === 'purchase_order')
        .forEach((item) => {
          if (item.advance_payment_date && item.advance_payment_amount) {
            paidAmount += item.advance_payment_amount;
            paidDetail.advance += item.advance_payment_amount;
          }
          if (item.balance_payment_date && item.balance_payment_amount) {
            paidAmount += item.balance_payment_amount;
            paidDetail.balance += item.balance_payment_amount;
          }
        });

      allHistory
        .filter((item) => item.source_type === 'packing_list')
        .forEach((item) => {
          if (item.wk_payment_date && item.pl_shipping_cost) {
            paidAmount += item.pl_shipping_cost;
            paidDetail.shipping += item.pl_shipping_cost;
          }
        });

      let pendingAmount = 0;
      const pendingDetail: PaymentDetail = { advance: 0, balance: 0, shipping: 0 };

      allRequests
        .filter((req) => req.status === '요청중')
        .forEach((req) => {
          pendingAmount += req.amount;
          if (req.payment_type === 'advance') {
            pendingDetail.advance += req.amount;
          } else if (req.payment_type === 'balance') {
            pendingDetail.balance += req.amount;
          } else if (req.payment_type === 'shipping') {
            pendingDetail.shipping += req.amount;
          }
        });

      allHistory
        .filter((item) => item.source_type === 'purchase_order')
        .forEach((item) => {
          if (
            item.advance_status === 'pending' &&
            !item.advance_payment_date &&
            item.advance_payment_amount &&
            !item.advance_payment_request
          ) {
            pendingAmount += item.advance_payment_amount;
            pendingDetail.advance += item.advance_payment_amount;
          }
          if (
            item.balance_status === 'pending' &&
            !item.balance_payment_date &&
            item.balance_payment_amount &&
            !item.balance_payment_request
          ) {
            pendingAmount += item.balance_payment_amount;
            pendingDetail.balance += item.balance_payment_amount;
          }
        });

      allHistory
        .filter((item) => item.source_type === 'packing_list')
        .forEach((item) => {
          if (
            item.status === 'pending' &&
            !item.wk_payment_date &&
            item.pl_shipping_cost &&
            !item.payment_request
          ) {
            pendingAmount += item.pl_shipping_cost;
            pendingDetail.shipping += item.pl_shipping_cost;
          }
        });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let requestedAmount = 0;
      const requestedDetail: PaymentDetail = { advance: 0, balance: 0, shipping: 0 };

      allRequests
        .filter((req) => req.status === '요청중')
        .forEach((req) => {
          const requestDate = new Date(req.request_date);
          requestDate.setHours(0, 0, 0, 0);

          if (requestDate <= today) {
            requestedAmount += req.amount;
            if (req.payment_type === 'advance') {
              requestedDetail.advance += req.amount;
            } else if (req.payment_type === 'balance') {
              requestedDetail.balance += req.amount;
            } else if (req.payment_type === 'shipping') {
              requestedDetail.shipping += req.amount;
            }
          }
        });

      const adminBuckets = aggregateAdminCostByPaymentBucket(allHistory, isOnOrAfterAdminCostFromDate);
      const confirmedLists = collectAdminCostConfirmedItems(allHistory, isOnOrAfterAdminCostFromDate);
      setConfirmedPoRows(confirmedLists.purchaseOrders);
      setConfirmedPlRows(confirmedLists.packingLists);

      setStatistics({
        paidAmount,
        pendingAmount,
        requestedAmount,
        paidDetail,
        pendingDetail,
        requestedDetail,
        adminCostTotal: adminBuckets.totalSum,
        adminCostDetail: adminBuckets.totalDetail,
        adminCostPending: adminBuckets.pendingSum,
        adminCostPendingDetail: adminBuckets.pendingDetail,
        adminCostConfirmed: adminBuckets.confirmedSum,
        adminCostConfirmedDetail: adminBuckets.confirmedDetail,
        adminCostPaid: adminBuckets.paidSum,
        adminCostPaidDetail: adminBuckets.paidDetail,
      });
    } catch (error: unknown) {
      console.error('통계 조회 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderDetail = (total: number, detail: PaymentDetail, highlightColor: string) => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-center px-4 py-3 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-300 shadow-sm">
        <span className={`text-3xl font-bold ${highlightColor}`}>
          ¥{total.toLocaleString('ko-KR')}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center justify-center px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-300 shadow-sm">
          <span className="text-xs text-blue-600 font-semibold mb-1">{t('payment.advance')}</span>
          <span className="text-base font-bold text-blue-700">¥{detail.advance.toLocaleString('ko-KR')}</span>
        </div>
        <div className="flex flex-col items-center justify-center px-3 py-2.5 rounded-lg bg-orange-50 border border-orange-300 shadow-sm">
          <span className="text-xs text-orange-600 font-semibold mb-1">{t('payment.balance')}</span>
          <span className="text-base font-bold text-orange-700">¥{detail.balance.toLocaleString('ko-KR')}</span>
        </div>
        <div className="flex flex-col items-center justify-center px-3 py-2.5 rounded-lg bg-indigo-50 border border-indigo-300 shadow-sm">
          <span className="text-xs text-indigo-600 font-semibold mb-1">{t('payment.shippingCost')}</span>
          <span className="text-base font-bold text-indigo-700">¥{detail.shipping.toLocaleString('ko-KR')}</span>
        </div>
      </div>
    </div>
  );

  const showFactoryCostCard = !isLevelC && typeof onFactoryCostRequestCardClick === 'function';

  return (
    <div className="space-y-6 mb-8">
      <div
        className={`grid grid-cols-1 gap-6 ${
          showFactoryCostCard ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-3'
        }`}
      >
        <div className="bg-white p-6 rounded-xl border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">{t('payment.paidTotal')}</h3>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-2xl font-bold text-gray-400">-</p>
            </div>
          ) : (
            renderDetail(statistics.paidAmount, statistics.paidDetail, 'text-green-600')
          )}
        </div>

        <div className="bg-white p-6 rounded-xl border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">{t('payment.scheduledTotal')}</h3>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-2xl font-bold text-gray-400">-</p>
            </div>
          ) : (
            renderDetail(statistics.pendingAmount, statistics.pendingDetail, 'text-yellow-600')
          )}
        </div>

        <div className="bg-white p-6 rounded-xl border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">{t('payment.requestTotal')}</h3>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-2xl font-bold text-gray-400">-</p>
            </div>
          ) : (
            renderDetail(statistics.requestedAmount, statistics.requestedDetail, 'text-purple-600')
          )}
        </div>

        {showFactoryCostCard && (
          <FactoryCostRequestCard
            title={t('payment.factoryCostRequestCardTitle')}
            hint={t('payment.factoryCostRequestCardHint')}
            totalCny={factoryCostRequestTotalCny}
            loading={factoryCostRequestLoading}
            onClick={onFactoryCostRequestCardClick!}
          />
        )}
      </div>

      {!isLevelC && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <AdminCostStatCard
            title={t('payment.adminCostTotalTitle')}
            isLoading={isLoading}
            total={statistics.adminCostTotal}
            detail={statistics.adminCostDetail}
            highlightClassName="text-indigo-600"
          />
          <AdminCostStatCard
            title={t('payment.adminCostPendingTitle')}
            isLoading={isLoading}
            total={statistics.adminCostPending}
            detail={statistics.adminCostPendingDetail}
            highlightClassName="text-yellow-600"
          />
          <AdminCostStatCard
            title={t('payment.adminCostConfirmedTitle')}
            isLoading={isLoading}
            total={statistics.adminCostConfirmed}
            detail={statistics.adminCostConfirmedDetail}
            highlightClassName="text-amber-700"
            onCardClick={() => setConfirmedModalOpen(true)}
          />
          <AdminCostStatCard
            title={t('payment.adminCostPaidTitle')}
            isLoading={isLoading}
            total={statistics.adminCostPaid}
            detail={statistics.adminCostPaidDetail}
            highlightClassName="text-green-600"
          />
        </div>
      )}

      {!isLevelC && (
        <AdminCostConfirmedModal
          isOpen={confirmedModalOpen}
          onClose={() => setConfirmedModalOpen(false)}
          purchaseOrders={confirmedPoRows}
          packingLists={confirmedPlRows}
        />
      )}
    </div>
  );
}
