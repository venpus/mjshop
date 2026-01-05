import React, { useState, useEffect, useMemo } from 'react';
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
import { calculateCommissionAmount } from '../../utils/purchaseOrderCalculations';
import { TablePagination } from '../ui/table-pagination';

interface PaymentHistoryTableProps {
  // type: 'all' | 'purchase-orders' | 'packing-lists';
  type: 'purchase-orders' | 'packing-lists';
  onStatisticsRefresh?: () => void; // 통계 카드 새로고침 콜백
  userLevel?: 'A-SuperAdmin' | 'S: Admin' | 'B0: 중국Admin' | 'C0: 한국Admin' | 'D0: 비전 담당자';
}

/**
 * 결제내역 테이블 컴포넌트
 */
export function PaymentHistoryTable({ type, onStatisticsRefresh, userLevel }: PaymentHistoryTableProps) {
  const { user } = useAuth();
  const isLevelC = userLevel === 'C0: 한국Admin';
  const [searchTerm, setSearchTerm] = useState('');
  // 발주관리 탭용 필터 타입
  type PurchaseOrderStatusFilter = 'all' | 'advance-paid-only' | 'pending' | 'all-paid' | 'requested';
  // 패킹리스트 탭용 필터 타입
  type PackingListStatusFilter = 'all' | 'paid' | 'requested' | 'pending';
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatusFilter | PackingListStatusFilter>('all');
  const [monthFilter, setMonthFilter] = useState<string>(''); // YYYY-MM 형식
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
  
  // 페이징 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // 월 필터를 start_date와 end_date로 변환
  const getMonthDateRange = (monthStr: string): { start_date?: string; end_date?: string } => {
    if (!monthStr) {
      return {};
    }
    
    const [year, month] = monthStr.split('-').map(Number);
    if (!year || !month) {
      return {};
    }

    // 해당 월의 첫날
    const startDate = new Date(year, month - 1, 1);
    const start_date = `${year}-${String(month).padStart(2, '0')}-01`;

    // 해당 월의 마지막날
    const endDate = new Date(year, month, 0);
    const end_date = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

    return { start_date, end_date };
  };

  useEffect(() => {
    loadPaymentHistory();
    // 필터 변경 시 첫 페이지로 이동
    setCurrentPage(1);
  }, [type, statusFilter, searchTerm, monthFilter]);

  // 월별 통계용 전체 데이터 로드 (월 필터가 있을 때만, 필터링 없이)
  useEffect(() => {
    if (type === 'purchase-orders' && monthFilter) {
      loadMonthlyStatisticsData();
    } else {
      setMonthlyStatisticsData([]);
    }
  }, [type, monthFilter]);

  const loadPaymentHistory = async () => {
    setIsLoading(true);
    try {
      const monthDateRange = getMonthDateRange(monthFilter);
      const filter: PaymentHistoryFilter = {
        // type: type === 'all' ? 'all' : type === 'purchase-orders' ? 'purchase-orders' : 'packing-lists',
        type: type === 'purchase-orders' ? 'purchase-orders' : 'packing-lists',
        // 상태 필터는 클라이언트에서 처리하므로 서버에는 'all'로 전달
        status: 'all',
        search: searchTerm || undefined,
        ...monthDateRange, // 월 필터가 있으면 start_date, end_date 추가
      };
      // 캐시 방지를 위한 타임스탬프 추가
      const data = await getPaymentHistory(filter);
      // 전체 데이터를 가져와서 클라이언트에서 필터링
      setPaymentHistory(data);
    } catch (error: any) {
      console.error('결제내역 조회 오류:', error);
      alert(error.message || '결제내역 조회에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 월별 통계용 전체 데이터 로드 (필터링 없이 해당 월의 모든 데이터)
  const loadMonthlyStatisticsData = async () => {
    try {
      const monthDateRange = getMonthDateRange(monthFilter);
      const filter: PaymentHistoryFilter = {
        type: 'purchase-orders',
        status: 'all', // 상태 필터 없음
        // search 없음 (검색어 필터 없음)
        include_all_orders: true, // 선금/잔금 조건 없이 모든 발주 포함
        ...monthDateRange, // 월 필터만 적용
      };
      const data = await getPaymentHistory(filter);
      console.log('[월별 통계] 서버에서 받은 전체 데이터 항목 수:', data.length);
      setMonthlyStatisticsData(data);
    } catch (error: any) {
      console.error('월별 통계 데이터 조회 오류:', error);
      // 통계 데이터 로드 실패해도 화면은 계속 표시
      setMonthlyStatisticsData([]);
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
    // showRequestForm을 먼저 저장 (setShowRequestForm(null) 전에)
    const currentRequestForm = showRequestForm;
    
    const createdRequest = await createPaymentRequest(data);
    setShowRequestForm(null);
    
    // 생성된 지급요청으로 해당 item 업데이트 (낙관적 업데이트)
    if (createdRequest && currentRequestForm) {
      const sourceId = currentRequestForm.sourceId;
      const paymentType = currentRequestForm.paymentType;
      
      // 해당 item 찾기
      const targetItem = paymentHistory.find(item => item.source_id === sourceId);
      if (targetItem) {
        const updates: Partial<PaymentHistoryItem> = {};
        
        if (paymentType === 'advance') {
          updates.advance_payment_request = {
            id: createdRequest.id,
            request_number: createdRequest.request_number,
            status: createdRequest.status,
          };
        } else if (paymentType === 'balance') {
          updates.balance_payment_request = {
            id: createdRequest.id,
            request_number: createdRequest.request_number,
            status: createdRequest.status,
          };
        } else if (paymentType === 'shipping') {
          updates.payment_request = {
            id: createdRequest.id,
            request_number: createdRequest.request_number,
            status: createdRequest.status,
          };
        }
        
        handleItemUpdate(targetItem.id, updates);
      }
    }
    
    // 통계 카드만 업데이트 (전체 리로드 없이)
    if (onStatisticsRefresh) {
      onStatisticsRefresh();
    }
  };

  // 특정 item만 업데이트하는 핸들러
  const handleItemUpdate = (itemId: string, updates: Partial<PaymentHistoryItem>) => {
    setPaymentHistory(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, ...updates }
          : item
      )
    );
  };

  // 발주관리 항목이 필터 조건에 맞는지 확인하는 함수
  const matchesPurchaseOrderFilter = (item: PaymentHistoryItem, filter: PurchaseOrderStatusFilter): boolean => {
    if (filter === 'all') return true;

    const hasAdvance = !!item.advance_payment_amount;
    const hasBalance = !!item.balance_payment_amount;
    const advancePaid = item.advance_status === 'paid';
    const balancePaid = item.balance_status === 'paid';
    const advancePending = item.advance_status === 'pending';
    const balancePending = item.balance_status === 'pending';
    const advanceRequested = item.advance_payment_request && item.advance_payment_request.status === '요청중';
    const balanceRequested = item.balance_payment_request && item.balance_payment_request.status === '요청중';

    switch (filter) {
      case 'advance-paid-only':
        // 선금만 지급 완료: 선금은 완료, 잔금은 완료가 아님
        return advancePaid && (!hasBalance || !balancePaid);
      
      case 'pending':
        // 지급 대기: 선금과 잔금 모두 완료가 아니고 요청중도 아님
        // 선금/잔금이 모두 없으면 제외
        if (!hasAdvance && !hasBalance) return false;
        // 선금이 있으면 대기이고 요청중이 아님
        if (hasAdvance && (!advancePending || advanceRequested)) return false;
        // 잔금이 있으면 대기이고 요청중이 아님
        if (hasBalance && (!balancePending || balanceRequested)) return false;
        return true;
      
      case 'all-paid':
        // 전체 지급 완료: 선금과 잔금이 모두 완료
        // 선금/잔금이 모두 없으면 제외
        if (!hasAdvance && !hasBalance) return false;
        // 선금이 있으면 완료여야 함
        if (hasAdvance && !advancePaid) return false;
        // 잔금이 있으면 완료여야 함
        if (hasBalance && !balancePaid) return false;
        return true;
      
      case 'requested':
        // 지급 요청 중: 선금 또는 잔금 중 하나라도 요청중
        return advanceRequested || balanceRequested;
      
      default:
        return true;
    }
  };

  // 패킹리스트 항목이 필터 조건에 맞는지 확인하는 함수
  const matchesPackingListFilter = (item: PaymentHistoryItem, filter: PackingListStatusFilter): boolean => {
    if (filter === 'all') return true;

    const isRequested = item.payment_request && item.payment_request.status === '요청중';
    const isPaid = !!item.wk_payment_date;

    switch (filter) {
      case 'paid':
        return isPaid;
      case 'requested':
        return isRequested;
      case 'pending':
        return !isPaid && !isRequested;
      default:
        return true;
    }
  };

  // 필터링된 데이터
  const filteredData = useMemo(() => {
    let filtered = paymentHistory;

    // 상태 필터 적용
    if (statusFilter !== 'all') {
      if (type === 'purchase-orders') {
        filtered = filtered.filter(item => 
          item.source_type === 'purchase_order' && 
          matchesPurchaseOrderFilter(item, statusFilter as PurchaseOrderStatusFilter)
        );
      } else {
        filtered = filtered.filter(item => 
          item.source_type === 'packing_list' && 
          matchesPackingListFilter(item, statusFilter as PackingListStatusFilter)
        );
      }
    }

    return filtered;
  }, [paymentHistory, statusFilter, type]);

  // 페이징된 데이터
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);

  const displayData = paginatedData;

  // 월별 통계용 전체 데이터 (필터링 없이 해당 월의 모든 데이터)
  const [monthlyStatisticsData, setMonthlyStatisticsData] = useState<PaymentHistoryItem[]>([]);

  // 월별 통계 계산 (발주관리 탭이고 월 필터가 있을 때만)
  const calculateMonthlyStatistics = () => {
    if (type !== 'purchase-orders' || !monthFilter) {
      return null;
    }

    console.log('[월별 통계] ========== 수수료 합산 시작 ==========');
    console.log('[월별 통계] 월 필터:', monthFilter);
    console.log('[월별 통계] 통계용 데이터 항목 수:', monthlyStatisticsData.length);
    console.log('[월별 통계] 화면 표시용 데이터 항목 수:', paymentHistory.length);

    // 월별 통계는 필터링 없이 해당 월의 모든 데이터 사용
    const purchaseOrderItems = monthlyStatisticsData.filter(
      (item) => item.source_type === 'purchase_order'
    );

    let totalQuantity = 0; // 발주량 합산
    let totalAmount = 0; // 총금액 합산
    let totalCommission = 0; // 수수료 합산

    // 수수료 계산 항목만 수집
    const commissionItems: Array<{
      product_name: string;
      po_number: string;
      unit_price: number;
      back_margin: number;
      quantity: number;
      commission_rate: number;
      order_unit_price: number;
      commission: number;
    }> = [];

    console.log('[월별 통계] 발주 항목 상세 정보:');
    purchaseOrderItems.forEach((item, index) => {
      console.log(`[월별 통계] 항목 ${index + 1}:`, {
        po_number: item.po_number,
        product_name: item.product_name,
        unit_price: item.unit_price,
        back_margin: item.back_margin,
        quantity: item.quantity,
        commission_rate: item.commission_rate,
        has_all_fields: item.unit_price !== undefined && 
                       item.back_margin !== undefined && 
                       item.quantity !== undefined && 
                       item.commission_rate !== undefined,
      });

      // 발주량 합산
      if (item.quantity) {
        totalQuantity += item.quantity;
      }

      // 총금액 합산
      if (item.final_payment_amount) {
        totalAmount += item.final_payment_amount;
      }

      // 수수료 합산: calculateCommissionAmount 함수 사용
      // back_margin이 undefined이거나 null이면 0으로 처리 (발주관리와 동일)
      if (
        item.unit_price !== undefined &&
        item.quantity !== undefined &&
        item.commission_rate !== undefined
      ) {
        const unitPrice = item.unit_price || 0;
        const backMargin = item.back_margin ?? 0; // undefined나 null이면 0
        const quantity = item.quantity || 0;
        const commissionRate = item.commission_rate || 0;
        
        // 발주단가 계산
        const orderUnitPrice = unitPrice + backMargin;

        // 발주관리와 동일한 계산 방식 사용
        const commission = calculateCommissionAmount(
          unitPrice,
          quantity,
          commissionRate,
          backMargin
        );

        totalCommission += commission;

        // 수수료 계산 항목 수집
        commissionItems.push({
          product_name: item.product_name || '(상품명 없음)',
          po_number: item.po_number || '(발주번호 없음)',
          unit_price: unitPrice,
          back_margin: backMargin,
          quantity: quantity,
          commission_rate: commissionRate,
          order_unit_price: orderUnitPrice,
          commission: commission,
        });
      }
    });

    // 수수료 항목만 상품 이름과 함께 출력
    console.log(`\n[월별 통계] 수수료 계산 항목 (${commissionItems.length}개):`);
    console.log('─────────────────────────────────────────────────────────');
    commissionItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item.product_name} (${item.po_number})`);
      console.log(`   발주단가: ¥${item.order_unit_price.toFixed(2)} (기본단가: ¥${item.unit_price.toFixed(2)} + 추가단가: ¥${item.back_margin.toFixed(2)})`);
      console.log(`   수량: ${item.quantity}개, 수수료율: ${item.commission_rate}%`);
      console.log(`   수수료: ¥${item.commission.toFixed(2)} (${item.order_unit_price.toFixed(2)} × ${item.quantity} × ${item.commission_rate}%)`);
      console.log('');
    });
    console.log('─────────────────────────────────────────────────────────');
    console.log(`[월별 통계] 최종 수수료 합산: ¥${totalCommission.toFixed(2)}`);
    console.log('[월별 통계] ======================================\n');

    return {
      totalQuantity,
      totalAmount,
      totalCommission,
    };
  };

  const monthlyStatistics = calculateMonthlyStatistics();

  return (
    <div className="space-y-4">
      {/* 월별 통계 (발주관리 탭이고 월 필터가 있을 때만 표시) */}
      {monthlyStatistics && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">
              {monthFilter.replace('-', '년 ').replace(/(\d{4})년 (\d{1,2})/, '$1년 $2월')} 통계
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="text-sm text-gray-600 mb-1">발주량 합산</div>
              <div className="text-2xl font-bold text-purple-700">
                {monthlyStatistics.totalQuantity.toLocaleString()}개
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-sm text-gray-600 mb-1">총금액 합산</div>
              <div className="text-2xl font-bold text-blue-700">
                ¥{monthlyStatistics.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="text-sm text-gray-600 mb-1">수수료 합산</div>
              <div className="text-2xl font-bold text-green-700">
                ¥{monthlyStatistics.totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      )}

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
          {/* 월별 필터 (발주관리 탭일 때만 표시) */}
          {type === 'purchase-orders' && (
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="월 선택"
            />
          )}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {type === 'purchase-orders' ? (
              <>
                <option value="all">전체</option>
                <option value="advance-paid-only">선금만 지급 완료</option>
                <option value="pending">지급 대기</option>
                <option value="all-paid">전체 지급 완료</option>
                <option value="requested">지급 요청 중</option>
              </>
            ) : (
              <>
                <option value="all">전체</option>
                <option value="paid">지급완료</option>
                <option value="requested">지급요청중</option>
                <option value="pending">지급대기</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* 페이징 (상단) */}
      {filteredData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredData.length}
            startIndex={startIndex}
            endIndex={endIndex - 1}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(items) => {
              setItemsPerPage(items);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      물류회사
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      실중량 (kg)
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      비율
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      중량 (kg)
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
                    {!isLevelC && (
                      <>
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
                    )}
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
                      최종 예상단가
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      발주량
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      총금액
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
                    {!isLevelC && (
                      <>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          A레벨 관리자 비용
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          지불 날짜
                        </th>
                      </>
                    )}
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={type === 'packing-lists' ? (isLevelC ? 11 : 14) : (isLevelC ? 11 : 14)} className="px-4 py-8 text-center text-gray-500">
                    로딩 중...
                  </td>
                </tr>
              ) : displayData.length === 0 ? (
                <tr>
                  <td colSpan={type === 'packing-lists' ? (isLevelC ? 11 : 14) : (isLevelC ? 11 : 14)} className="px-4 py-8 text-center text-gray-500">
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
                    onItemUpdate={handleItemUpdate}
                    onStatisticsRefresh={onStatisticsRefresh}
                    onViewOrderDetail={(orderId) => setSelectedOrderId(orderId)}
                    userLevel={userLevel}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 페이징 (하단) */}
      {filteredData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredData.length}
            startIndex={startIndex}
            endIndex={endIndex - 1}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(items) => {
              setItemsPerPage(items);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

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

