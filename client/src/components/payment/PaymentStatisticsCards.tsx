import React, { useState, useEffect } from 'react';
import {
  getPaymentHistory,
  PaymentHistoryItem,
} from '../../api/paymentHistoryApi';
import { getAllPaymentRequests, PaymentRequest } from '../../api/paymentRequestApi';

interface PaymentDetail {
  advance: number; // 선금
  balance: number; // 잔금
  shipping: number; // 배송비
}

interface AdminCostDetail {
  backMargin: number; // 발주 주가비
  shippingDifference: number; // 배송비 추가비
}

interface PaymentStatistics {
  paidAmount: number; // 지급된 금액 총계
  pendingAmount: number; // 지급 예정 총계
  requestedAmount: number; // 금일까지 지급요청 총계
  paidDetail: PaymentDetail; // 지급된 금액 상세
  pendingDetail: PaymentDetail; // 지급 예정 금액 상세
  requestedDetail: PaymentDetail; // 지급요청 금액 상세
  adminCostTotal: number; // A레벨 관리자 추가 비용 총계
  adminCostDetail: AdminCostDetail; // A레벨 관리자 추가 비용 상세
  adminCostPending: number; // A레벨 관리자 지급예정 비용
  adminCostPendingDetail: AdminCostDetail; // A레벨 관리자 지급예정 비용 상세
  adminCostPaid: number; // A레벨 관리자 지급완료 비용
  adminCostPaidDetail: AdminCostDetail; // A레벨 관리자 지급완료 비용 상세
}

interface PaymentStatisticsCardsProps {
  refreshTrigger?: number; // 새로고침 트리거
  userLevel?: 'A-SuperAdmin' | 'S: Admin' | 'B0: 중국Admin' | 'C0: 한국Admin';
}

/**
 * 결제 통계 카드 컴포넌트
 */
export function PaymentStatisticsCards({ refreshTrigger, userLevel }: PaymentStatisticsCardsProps) {
  const isLevelC = userLevel === 'C0: 한국Admin';
  const [statistics, setStatistics] = useState<PaymentStatistics>({
    paidAmount: 0,
    pendingAmount: 0,
    requestedAmount: 0,
    paidDetail: { advance: 0, balance: 0, shipping: 0 },
    pendingDetail: { advance: 0, balance: 0, shipping: 0 },
    requestedDetail: { advance: 0, balance: 0, shipping: 0 },
    adminCostTotal: 0,
    adminCostDetail: { backMargin: 0, shippingDifference: 0 },
    adminCostPending: 0,
    adminCostPendingDetail: { backMargin: 0, shippingDifference: 0 },
    adminCostPaid: 0,
    adminCostPaidDetail: { backMargin: 0, shippingDifference: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, [refreshTrigger]);

  const loadStatistics = async () => {
    setIsLoading(true);
    try {
      // 발주관리와 패킹리스트 결제 내역 조회 (필터 없이 전체 조회)
      const [poHistory, plHistory, allRequests] = await Promise.all([
        getPaymentHistory({ type: 'purchase-orders' }),
        getPaymentHistory({ type: 'packing-lists' }),
        getAllPaymentRequests(),
      ]);

      const allHistory: PaymentHistoryItem[] = [...poHistory, ...plHistory];

      // 1. 지급된 금액 총계 계산 (상세 포함)
      // 주의: 지급요청이 완료되면 원본 데이터의 payment_date가 업데이트되므로,
      // payment_date 기준으로만 계산하면 중복 없이 정확한 지급액을 구할 수 있습니다.
      let paidAmount = 0;
      const paidDetail: PaymentDetail = { advance: 0, balance: 0, shipping: 0 };

      // 발주관리: 선금/잔금 지급일이 있는 경우
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

      // 패킹리스트: 배송비 지급일이 있는 경우
      allHistory
        .filter((item) => item.source_type === 'packing_list')
        .forEach((item) => {
          if (item.wk_payment_date && item.pl_shipping_cost) {
            paidAmount += item.pl_shipping_cost;
            paidDetail.shipping += item.pl_shipping_cost;
          }
        });

      // 2. 지급 예정 총계 계산 (상세 포함)
      // 요청중이거나 지급대기 상태인 항목 모두 포함
      let pendingAmount = 0;
      const pendingDetail: PaymentDetail = { advance: 0, balance: 0, shipping: 0 };

      // 지급요청: 상태가 '요청중'인 경우
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

      // 발주관리: 지급대기 상태이고 지급일이 없는 경우 (지급요청이 없는 항목)
      allHistory
        .filter((item) => item.source_type === 'purchase_order')
        .forEach((item) => {
          // 선금: 지급대기이고 지급일이 없고 지급요청이 없는 경우
          if (
            item.advance_status === 'pending' &&
            !item.advance_payment_date &&
            item.advance_payment_amount &&
            !item.advance_payment_request
          ) {
            pendingAmount += item.advance_payment_amount;
            pendingDetail.advance += item.advance_payment_amount;
          }
          // 잔금: 지급대기이고 지급일이 없고 지급요청이 없는 경우
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

      // 패킹리스트: 지급대기 상태이고 지급일이 없는 경우 (지급요청이 없는 항목)
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

      // 3. 금일까지 지급요청 총계 계산 (상세 포함)
      // 상태가 '요청중'인 항목만 포함 (완료된 과거 데이터 제외)
      const today = new Date();
      today.setHours(0, 0, 0, 0); // 오늘 00:00:00

      let requestedAmount = 0;
      const requestedDetail: PaymentDetail = { advance: 0, balance: 0, shipping: 0 };
      
      allRequests
        .filter((req) => req.status === '요청중') // 요청중인 항목만
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

      // 4. A레벨 관리자 추가 비용 총계 계산
      let adminCostTotal = 0;
      const adminCostDetail: AdminCostDetail = { backMargin: 0, shippingDifference: 0 };

      // 발주관리: admin_total_cost 또는 (back_margin * quantity) + admin_cost_items 합계
      allHistory
        .filter((item) => item.source_type === 'purchase_order')
        .forEach((item) => {
          let adminCost = 0;
          
          // admin_total_cost가 있으면 우선 사용
          if (item.admin_total_cost !== undefined && item.admin_total_cost !== null) {
            adminCost = item.admin_total_cost;
          } else {
            // 없으면 (back_margin * quantity) + admin_cost_items 합계로 계산
            const backMargin = item.back_margin || 0;
            const quantity = item.quantity || 0;
            const backMarginTotal = backMargin * quantity; // 추가단가 * 수량
            const adminCostItemsTotal = item.admin_cost_items
              ? item.admin_cost_items.reduce((sum, costItem) => sum + (costItem.cost || 0), 0)
              : 0;
            adminCost = backMarginTotal + adminCostItemsTotal;
          }
          
          adminCostTotal += adminCost;
          
          // 발주 주가비 (back_margin * quantity)
          const backMargin = item.back_margin || 0;
          const quantity = item.quantity || 0;
          adminCostDetail.backMargin += backMargin * quantity;
        });

      // 패킹리스트: shipping_cost_difference
      allHistory
        .filter((item) => item.source_type === 'packing_list')
        .forEach((item) => {
          const shippingDiff = item.shipping_cost_difference || 0;
          adminCostTotal += shippingDiff;
          adminCostDetail.shippingDifference += shippingDiff;
        });

      // 5. A레벨 관리자 지급예정/지급완료 비용 계산 (상세 포함)
      let adminCostPending = 0; // 지급예정
      let adminCostPaid = 0; // 지급완료
      const adminCostPendingDetail: AdminCostDetail = { backMargin: 0, shippingDifference: 0 };
      const adminCostPaidDetail: AdminCostDetail = { backMargin: 0, shippingDifference: 0 };

      // 발주관리 항목만 대상 (패킹리스트는 제외)
      allHistory
        .filter((item) => item.source_type === 'purchase_order')
        .forEach((item) => {
          let adminCost = 0;
          
          // admin_total_cost가 있으면 우선 사용
          if (item.admin_total_cost !== undefined && item.admin_total_cost !== null) {
            adminCost = item.admin_total_cost;
          } else {
            // 없으면 (back_margin * quantity) + admin_cost_items 합계로 계산
            const backMargin = item.back_margin || 0;
            const quantity = item.quantity || 0;
            const backMarginTotal = backMargin * quantity;
            const adminCostItemsTotal = item.admin_cost_items
              ? item.admin_cost_items.reduce((sum, costItem) => sum + (costItem.cost || 0), 0)
              : 0;
            adminCost = backMarginTotal + adminCostItemsTotal;
          }

          // 발주 주가비 계산
          const backMargin = item.back_margin || 0;
          const quantity = item.quantity || 0;
          const backMarginTotal = backMargin * quantity;

          // admin_cost_paid가 true이면 지급완료, false이거나 undefined이면 지급예정
          if (item.admin_cost_paid === true) {
            adminCostPaid += adminCost;
            adminCostPaidDetail.backMargin += backMarginTotal;
            // A레벨 관리자 입력 비용 (admin_cost_items)
            const adminCostItemsTotal = item.admin_cost_items
              ? item.admin_cost_items.reduce((sum, costItem) => sum + (costItem.cost || 0), 0)
              : 0;
            // shippingDifference는 발주관리 항목에는 없으므로 0으로 유지
          } else {
            adminCostPending += adminCost;
            adminCostPendingDetail.backMargin += backMarginTotal;
            // A레벨 관리자 입력 비용 (admin_cost_items)
            const adminCostItemsTotal = item.admin_cost_items
              ? item.admin_cost_items.reduce((sum, costItem) => sum + (costItem.cost || 0), 0)
              : 0;
            // shippingDifference는 발주관리 항목에는 없으므로 0으로 유지
          }
        });

      // 패킹리스트의 shipping_cost_difference는 admin_cost_paid 상태에 따라 지급예정/지급완료로 구분
      allHistory
        .filter((item) => item.source_type === 'packing_list')
        .forEach((item) => {
          const shippingDiff = item.shipping_cost_difference || 0;
          if (item.admin_cost_paid) {
            // 지급완료
            adminCostPaid += shippingDiff;
            adminCostPaidDetail.shippingDifference += shippingDiff;
          } else {
            // 지급예정
            adminCostPending += shippingDiff;
            adminCostPendingDetail.shippingDifference += shippingDiff;
          }
        });

      setStatistics({
        paidAmount,
        pendingAmount,
        requestedAmount,
        paidDetail,
        pendingDetail,
        requestedDetail,
        adminCostTotal,
        adminCostDetail,
        adminCostPending,
        adminCostPendingDetail,
        adminCostPaid,
        adminCostPaidDetail,
      });
    } catch (error: any) {
      console.error('통계 조회 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return `¥${amount.toLocaleString('ko-KR')}`;
  };

  const renderDetail = (total: number, detail: PaymentDetail, highlightColor: string) => (
    <div className="flex flex-col gap-3">
      {/* 총계 부분 */}
      <div className="flex items-center justify-center px-4 py-3 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-300 shadow-sm">
        <span className={`text-3xl font-bold ${highlightColor}`}>{formatCurrency(total)}</span>
      </div>
      
      {/* 상세 내역 그룹 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center justify-center px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-300 shadow-sm">
          <span className="text-xs text-blue-600 font-semibold mb-1">선금</span>
          <span className="text-base font-bold text-blue-700">{formatCurrency(detail.advance)}</span>
        </div>
        <div className="flex flex-col items-center justify-center px-3 py-2.5 rounded-lg bg-orange-50 border border-orange-300 shadow-sm">
          <span className="text-xs text-orange-600 font-semibold mb-1">잔금</span>
          <span className="text-base font-bold text-orange-700">{formatCurrency(detail.balance)}</span>
        </div>
        <div className="flex flex-col items-center justify-center px-3 py-2.5 rounded-lg bg-indigo-50 border border-indigo-300 shadow-sm">
          <span className="text-xs text-indigo-600 font-semibold mb-1">배송비</span>
          <span className="text-base font-bold text-indigo-700">{formatCurrency(detail.shipping)}</span>
        </div>
      </div>
    </div>
  );

  const renderAdminCostDetail = (total: number, detail: AdminCostDetail, highlightColor: string) => (
    <div className="flex flex-col gap-3">
      {/* 총계 부분 */}
      <div className="flex items-center justify-center px-4 py-3 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-300 shadow-sm">
        <span className={`text-3xl font-bold ${highlightColor}`}>{formatCurrency(total)}</span>
      </div>
      
      {/* 상세 내역 그룹 */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col items-center justify-center px-3 py-2.5 rounded-lg bg-teal-50 border border-teal-300 shadow-sm">
          <span className="text-xs text-teal-600 font-semibold mb-1">발주 주가비</span>
          <span className="text-base font-bold text-teal-700">{formatCurrency(detail.backMargin)}</span>
        </div>
        <div className="flex flex-col items-center justify-center px-3 py-2.5 rounded-lg bg-cyan-50 border border-cyan-300 shadow-sm">
          <span className="text-xs text-cyan-600 font-semibold mb-1">배송비 추가비</span>
          <span className="text-base font-bold text-cyan-700">{formatCurrency(detail.shippingDifference)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 mb-8">
      {/* 첫 번째 줄: 지급 관련 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 지급된 금액 총계 */}
        <div className="bg-white p-6 rounded-xl border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">지급된 금액 총계</h3>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-2xl font-bold text-gray-400">-</p>
            </div>
          ) : (
            renderDetail(statistics.paidAmount, statistics.paidDetail, 'text-green-600')
          )}
        </div>

        {/* 지급 예정 총계 */}
        <div className="bg-white p-6 rounded-xl border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">지급 예정 총계</h3>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-2xl font-bold text-gray-400">-</p>
            </div>
          ) : (
            renderDetail(statistics.pendingAmount, statistics.pendingDetail, 'text-yellow-600')
          )}
        </div>

        {/* 금일까지 지급요청 총계 */}
        <div className="bg-white p-6 rounded-xl border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">금일까지 지급요청 총계</h3>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-2xl font-bold text-gray-400">-</p>
            </div>
          ) : (
            renderDetail(statistics.requestedAmount, statistics.requestedDetail, 'text-purple-600')
          )}
        </div>
      </div>

      {/* 두 번째 줄: A레벨 관리자 비용 관련 카드들 (C0 레벨은 숨김) */}
      {!isLevelC && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* A레벨 관리자 추가 비용 총계 */}
          <div className="bg-white p-6 rounded-xl border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow">
            <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">A레벨 관리자 추가 비용 총계</h3>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-2xl font-bold text-gray-400">-</p>
              </div>
            ) : (
              renderAdminCostDetail(statistics.adminCostTotal, statistics.adminCostDetail, 'text-indigo-600')
            )}
          </div>

          {/* A레벨 관리자 지급예정 비용 */}
          <div className="bg-white p-6 rounded-xl border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow">
            <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">A레벨 관리자 지급예정 비용</h3>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-2xl font-bold text-gray-400">-</p>
              </div>
            ) : (
              renderAdminCostDetail(statistics.adminCostPending, statistics.adminCostPendingDetail, 'text-yellow-600')
            )}
          </div>

          {/* A레벨 관리자 지급완료 비용 */}
          <div className="bg-white p-6 rounded-xl border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow">
            <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">A레벨 관리자 지급완료 비용</h3>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-2xl font-bold text-gray-400">-</p>
              </div>
            ) : (
              renderAdminCostDetail(statistics.adminCostPaid, statistics.adminCostPaidDetail, 'text-green-600')
            )}
          </div>
        </div>
      )}
    </div>
  );
}

