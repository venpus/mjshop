import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, Clock, Calendar, FileDown } from 'lucide-react';
import {
  PaymentRequest,
  getAllPaymentRequests,
  batchCompletePaymentRequests,
  batchRevertPaymentRequests,
} from '../../api/paymentRequestApi';
import { PaymentRequestStatusBadge } from './PaymentRequestStatusBadge';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateKST, getLocalDateString } from '../../utils/dateUtils';
import { printPaymentRequestLedger } from '../../utils/printUtils';

interface PaymentRequestLedgerProps {
  onRefresh?: () => void;
}

interface DateGroup {
  date: string;
  items: PaymentRequest[];
  totals: {
    advance: number;
    balance: number;
    shipping: number;
  };
  allCompleted: boolean;
}

/**
 * 지급요청 장부 컴포넌트
 * 날짜별로 지급요청을 그룹화하여 표시합니다.
 */
export function PaymentRequestLedger({ onRefresh }: PaymentRequestLedgerProps) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [dateGroups, setDateGroups] = useState<DateGroup[]>([]);
  const [processingDates, setProcessingDates] = useState<Set<string>>(new Set());

  const isAdminLevelA = user?.level === 'A-SuperAdmin' || user?.level === 'S: Admin' || user?.level === 'B0: 중국Admin';

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const data = await getAllPaymentRequests();
      setRequests(data);
      groupByDate(data);
    } catch (error: any) {
      console.error('지급요청 조회 오류:', error);
      alert(error.message || '지급요청 조회에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const groupByDate = (requestsData: PaymentRequest[]) => {
    const grouped: { [key: string]: DateGroup } = {};

    requestsData.forEach((request) => {
      const date = request.request_date.split('T')[0]; // YYYY-MM-DD 형식으로 변환
      
      if (!grouped[date]) {
        grouped[date] = {
          date,
          items: [],
          totals: {
            advance: 0,
            balance: 0,
            shipping: 0,
          },
          allCompleted: true,
        };
      }

      grouped[date].items.push(request);

      // 총계 계산
      if (request.payment_type === 'advance') {
        grouped[date].totals.advance += request.amount;
      } else if (request.payment_type === 'balance') {
        grouped[date].totals.balance += request.amount;
      } else if (request.payment_type === 'shipping') {
        grouped[date].totals.shipping += request.amount;
      }

      // 모든 항목이 완료되었는지 확인
      if (request.status !== '완료') {
        grouped[date].allCompleted = false;
      }
    });

    // 날짜순 정렬 (최신순)
    const sorted = Object.values(grouped).sort((a, b) => 
      b.date.localeCompare(a.date)
    );

    setDateGroups(sorted);
  };

  const toggleExpand = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  const handleBatchComplete = async (date: string) => {
    const group = dateGroups.find((g) => g.date === date);
    if (!group) return;

    const pendingIds = group.items
      .filter((item) => item.status === '요청중')
      .map((item) => item.id);

    if (pendingIds.length === 0) {
      alert('지급완료할 항목이 없습니다.');
      return;
    }

    const paymentDate = getLocalDateString();
    if (!confirm(`${formatDateKST(date)}의 모든 지급요청을 완료 처리하시겠습니까?`)) {
      return;
    }

    setProcessingDates((prev) => new Set(prev).add(date));
    try {
      await batchCompletePaymentRequests(pendingIds, paymentDate);
      await loadRequests();
      onRefresh?.();
    } catch (error: any) {
      alert(error.message || '일괄 지급완료 처리에 실패했습니다.');
    } finally {
      setProcessingDates((prev) => {
        const newSet = new Set(prev);
        newSet.delete(date);
        return newSet;
      });
    }
  };

  const handleBatchRevert = async (date: string) => {
    const group = dateGroups.find((g) => g.date === date);
    if (!group) return;

    const completedIds = group.items
      .filter((item) => item.status === '완료')
      .map((item) => item.id);

    if (completedIds.length === 0) {
      alert('지급해제할 항목이 없습니다.');
      return;
    }

    if (!confirm(`${formatDateKST(date)}의 모든 지급요청을 해제하시겠습니까?`)) {
      return;
    }

    setProcessingDates((prev) => new Set(prev).add(date));
    try {
      await batchRevertPaymentRequests(completedIds);
      await loadRequests();
      onRefresh?.();
    } catch (error: any) {
      alert(error.message || '일괄 지급해제 처리에 실패했습니다.');
    } finally {
      setProcessingDates((prev) => {
        const newSet = new Set(prev);
        newSet.delete(date);
        return newSet;
      });
    }
  };

  const getPaymentTypeLabel = (type: string): string => {
    switch (type) {
      case 'advance':
        return '선금';
      case 'balance':
        return '잔금';
      case 'shipping':
        return '배송비';
      default:
        return type;
    }
  };

  const getTotalAmount = (group: DateGroup): number => {
    return group.totals.advance + group.totals.balance + group.totals.shipping;
  };

  const handlePrintPDF = (group: DateGroup) => {
    try {
      printPaymentRequestLedger(group);
    } catch (error: any) {
      console.error('인쇄 오류:', error);
      alert(error.message || '인쇄에 실패했습니다.');
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">로딩 중...</div>;
  }

  if (dateGroups.length === 0) {
    return <div className="text-center py-8 text-gray-500">지급요청이 없습니다.</div>;
  }

  return (
    <div className="space-y-4">
      {dateGroups.map((group) => {
        const isExpanded = expandedDates.has(group.date);
        const isProcessing = processingDates.has(group.date);
        const totalAmount = getTotalAmount(group);

        return (
          <div key={group.date} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* 날짜별 헤더 */}
            <div className="bg-gray-50 p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <button
                    onClick={() => toggleExpand(group.date)}
                    className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                    <Calendar className="w-4 h-4" />
                    <span className="font-semibold text-lg">{formatDateKST(group.date)}</span>
                  </button>
                </div>

                {/* 총계 정보 */}
                <div className="flex items-center gap-6 mr-4">
                  <div className="text-right">
                    <div className="text-xs text-gray-500">선금</div>
                    <div className="font-semibold text-gray-900">
                      ¥{group.totals.advance.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">잔금</div>
                    <div className="font-semibold text-gray-900">
                      ¥{group.totals.balance.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">배송비</div>
                    <div className="font-semibold text-gray-900">
                      ¥{group.totals.shipping.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right border-l pl-6">
                    <div className="text-xs text-gray-500">총계</div>
                    <div className="font-bold text-lg text-purple-600">
                      ¥{totalAmount.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* PDF 인쇄 버튼, 상태 및 액션 버튼 */}
                <div className="flex items-center gap-3">
                  {/* PDF 인쇄 버튼 */}
                  <button
                    onClick={() => handlePrintPDF(group)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
                    title="PDF로 인쇄"
                  >
                    <FileDown className="w-4 h-4" />
                    PDF
                  </button>

                  <div className="flex items-center gap-2">
                    {group.allCompleted ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-green-600 font-medium">모두 완료</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-5 h-5 text-yellow-600" />
                        <span className="text-sm text-yellow-600 font-medium">일부 미완료</span>
                      </>
                    )}
                  </div>

                  {isAdminLevelA && (
                    <div className="flex items-center gap-2">
                      {!group.allCompleted && (
                        <button
                          onClick={() => handleBatchComplete(group.date)}
                          disabled={isProcessing}
                          className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isProcessing ? '처리 중...' : '지급완료'}
                        </button>
                      )}
                      {group.allCompleted && (
                        <button
                          onClick={() => handleBatchRevert(group.date)}
                          disabled={isProcessing}
                          className="px-3 py-1.5 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isProcessing ? '처리 중...' : '지급해제'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 상세 항목 (펼침 시) */}
            {isExpanded && (
              <div className="p-4 bg-gray-50">
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <PaymentRequestLedgerItem key={item.id} request={item} />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * 지급요청 장부 항목 컴포넌트
 */
interface PaymentRequestLedgerItemProps {
  request: PaymentRequest;
}

function PaymentRequestLedgerItem({ request }: PaymentRequestLedgerItemProps) {
  const getPaymentTypeLabel = (type: string): string => {
    switch (type) {
      case 'advance':
        return '선금';
      case 'balance':
        return '잔금';
      case 'shipping':
        return '배송비';
      default:
        return type;
    }
  };

  const getSourceLabel = (): string => {
    if (request.source_type === 'purchase_order' && request.source_info?.po_number) {
      return request.source_info.po_number;
    }
    if (request.source_type === 'packing_list' && request.source_info?.packing_code) {
      return request.source_info.packing_code;
    }
    return request.source_id;
  };

  const getProductName = (): string => {
    if (request.source_type === 'purchase_order' && request.source_info?.product_name) {
      return request.source_info.product_name;
    }
    return '-';
  };

  return (
    <div className="bg-white border border-gray-200 rounded p-3">
      <div className="flex items-center justify-between">
        <div className="flex-1 grid grid-cols-12 gap-4 items-center">
          {/* 발주상품인 경우 */}
          {request.source_type === 'purchase_order' && (
            <>
              <div className="col-span-4">
                <div className="text-sm font-medium text-gray-900">{getProductName()}</div>
                <div className="text-xs text-gray-500">{getSourceLabel()}</div>
              </div>
              <div className="col-span-2">
                <span className="text-sm text-gray-700">{getPaymentTypeLabel(request.payment_type)}</span>
              </div>
              <div className="col-span-2 text-right">
                <span className="text-sm font-semibold text-gray-900">
                  ¥{request.amount.toLocaleString()}
                </span>
              </div>
              <div className="col-span-4 flex items-center justify-end gap-2">
                <PaymentRequestStatusBadge status={request.status} size="xs" />
              </div>
            </>
          )}

          {/* 패킹리스트인 경우 */}
          {request.source_type === 'packing_list' && (
            <>
              <div className="col-span-3">
                <div className="text-sm font-medium text-gray-900">{getSourceLabel()}</div>
              </div>
              <div className="col-span-3">
                <span className="text-sm text-gray-500">-</span>
              </div>
              <div className="col-span-2 text-right">
                <span className="text-sm font-semibold text-gray-900">
                  ¥{request.amount.toLocaleString()}
                </span>
              </div>
              <div className="col-span-4 flex items-center justify-end gap-2">
                <PaymentRequestStatusBadge status={request.status} size="xs" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

