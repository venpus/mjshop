import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import { PaymentRequestStatusBadge } from './PaymentRequestStatusBadge';
import { PaymentRequestForm } from './PaymentRequestForm';
import {
  getPaymentRequestsBySource,
  createPaymentRequest,
  CreatePaymentRequestDTO,
} from '../../api/paymentRequestApi';
import { PaymentRequest } from '../../api/paymentRequestApi';
import { useAuth } from '../../contexts/AuthContext';
import { PaymentHistoryRow } from './PaymentHistoryRow';
import {
  getPaymentHistory,
  PaymentHistoryItem,
  PaymentHistoryFilter,
} from '../../api/paymentHistoryApi';
import { PurchaseOrderDetailModal } from './PurchaseOrderDetailModal';

interface PaymentHistoryTableProps {
  // type: 'all' | 'purchase-orders' | 'packing-lists';
  type: 'purchase-orders' | 'packing-lists';
  onStatisticsRefresh?: () => void; // 통계 카드 새로고침 콜백
}

/**
 * 결제내역 테이블 컴포넌트
 */
export function PaymentHistoryTable({ type, onStatisticsRefresh }: PaymentHistoryTableProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showRequestForm, setShowRequestForm] = useState<{
    sourceType: 'purchase_order' | 'packing_list';
    sourceId: string;
    paymentType: 'advance' | 'balance' | 'shipping';
    amount: number;
    sourceInfo?: any;
  } | null>(null);

  // 발주 상세 모달 상태
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const isAdminLevelA = user?.level === 'A-SuperAdmin' || user?.level === 'S: Admin' || user?.level === 'B0: 중국Admin';

  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPaymentHistory();
  }, [type, statusFilter, searchTerm]);

  const loadPaymentHistory = async () => {
    setIsLoading(true);
    try {
      const filter: PaymentHistoryFilter = {
        // type: type === 'all' ? 'all' : type === 'purchase-orders' ? 'purchase-orders' : 'packing-lists',
        type: type === 'purchase-orders' ? 'purchase-orders' : 'packing-lists',
        status: statusFilter === 'all' ? 'all' : statusFilter,
        search: searchTerm || undefined,
      };
      // 캐시 방지를 위한 타임스탬프 추가
      const data = await getPaymentHistory(filter);
      setPaymentHistory(data);
    } catch (error: any) {
      console.error('결제내역 조회 오류:', error);
      alert(error.message || '결제내역 조회에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleRequestPayment = (
    sourceType: 'purchase_order' | 'packing_list',
    sourceId: string,
    paymentType: 'advance' | 'balance' | 'shipping',
    amount: number,
    sourceInfo?: any
  ) => {
    setShowRequestForm({
      sourceType,
      sourceId,
      paymentType,
      amount,
      sourceInfo,
    });
  };

  const handleCreateRequest = async (data: CreatePaymentRequestDTO) => {
    await createPaymentRequest(data);
    setShowRequestForm(null);
    loadPaymentHistory();
    // 통계 카드 새로고침
    if (onStatisticsRefresh) {
      onStatisticsRefresh();
    }
  };

  const displayData = paymentHistory;

  return (
    <div className="space-y-4">
      {/* 필터 */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="발주번호, 패킹코드로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">전체</option>
            <option value="paid">지급완료</option>
            <option value="pending">지급대기</option>
          </select>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12"></th>
                {type === 'packing-lists' ? (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      구분
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      패킹리스트 코드
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      실중량
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      비율
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      중량
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      배송비
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      지급요청
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      지급 날짜
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      A레벨 관리자 비용
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      지불완료
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      지불 날짜
                    </th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      구분
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상품사진
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상품명
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      발주코드
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      선금
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      선금 지급 상태
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      잔금
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      잔금 지급 상태
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      A레벨 관리자 비용
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      지불 날짜
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={type === 'packing-lists' ? 13 : 11} className="px-4 py-8 text-center text-gray-500">
                    로딩 중...
                  </td>
                </tr>
              ) : displayData.length === 0 ? (
                <tr>
                  <td colSpan={type === 'packing-lists' ? 13 : 11} className="px-4 py-8 text-center text-gray-500">
                    결제 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                displayData.map((item) => (
                  <PaymentHistoryRow
                    key={item.id}
                    item={item}
                    isExpanded={expandedRows.has(item.id)}
                    onToggleExpand={() => handleToggleRow(item.id)}
                    onRequestPayment={handleRequestPayment}
                    isAdminLevelA={isAdminLevelA}
                    onRefresh={() => {
                      loadPaymentHistory();
                      // 통계 카드 새로고침
                      if (onStatisticsRefresh) {
                        onStatisticsRefresh();
                      }
                    }}
                    onViewOrderDetail={(orderId) => setSelectedOrderId(orderId)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 지급요청 폼 */}
      {showRequestForm && (
        <PaymentRequestForm
          sourceType={showRequestForm.sourceType}
          sourceId={showRequestForm.sourceId}
          paymentType={showRequestForm.paymentType}
          amount={showRequestForm.amount}
          sourceInfo={showRequestForm.sourceInfo}
          onClose={() => setShowRequestForm(null)}
          onSubmit={handleCreateRequest}
        />
      )}

      {/* 발주 상세 모달 */}
      {selectedOrderId && (
        <PurchaseOrderDetailModal
          orderId={selectedOrderId}
          isOpen={!!selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          returnPath="/admin/payment-history"
        />
      )}
    </div>
  );
}

