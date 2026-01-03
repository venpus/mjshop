import React, { useState, useEffect } from 'react';
import { Search, Filter, CheckSquare, Square } from 'lucide-react';
import {
  PaymentRequest,
  PaymentRequestFilter,
  getAllPaymentRequests,
  batchCompletePaymentRequests,
  deletePaymentRequest,
} from '../../api/paymentRequestApi';
import { PaymentRequestItem } from './PaymentRequestItem';
import { useAuth } from '../../contexts/AuthContext';
import { getLocalDateString } from '../../utils/dateUtils';

interface PaymentRequestListProps {
  onRefresh?: () => void;
}

/**
 * 지급요청 목록 컴포넌트
 */
export function PaymentRequestList({ onRefresh }: PaymentRequestListProps) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [filter, setFilter] = useState<PaymentRequestFilter>({
    status: undefined,
    source_type: undefined,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showBatchComplete, setShowBatchComplete] = useState(false);
  const [batchPaymentDate, setBatchPaymentDate] = useState(
    getLocalDateString()
  );
  const [isCompleting, setIsCompleting] = useState(false);

  const isAdminLevelA = user?.level === 'A-SuperAdmin' || user?.level === 'S: Admin';

  useEffect(() => {
    loadRequests();
  }, [filter]);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const currentFilter: PaymentRequestFilter = {
        ...filter,
        search: searchTerm || undefined,
      };
      const data = await getAllPaymentRequests(currentFilter);
      setRequests(data);
    } catch (error: any) {
      console.error('지급요청 조회 오류:', error);
      alert(error.message || '지급요청 조회에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    loadRequests();
  };

  const handleStatusFilter = (status?: PaymentRequestStatus) => {
    setFilter({ ...filter, status });
    setSelectedIds([]);
  };

  const handleSourceTypeFilter = (sourceType?: PaymentRequestSourceType) => {
    setFilter({ ...filter, source_type: sourceType });
    setSelectedIds([]);
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const pendingRequests = requests.filter((r) => r.status === '요청중');
    if (selectedIds.length === pendingRequests.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingRequests.map((r) => r.id));
    }
  };

  const handleComplete = async () => {
    if (selectedIds.length === 0) {
      alert('지급완료할 항목을 선택해주세요.');
      return;
    }

    if (!batchPaymentDate) {
      alert('지급일을 입력해주세요.');
      return;
    }

    setIsCompleting(true);
    try {
      await batchCompletePaymentRequests(selectedIds, batchPaymentDate);
      setSelectedIds([]);
      setShowBatchComplete(false);
      loadRequests();
      onRefresh?.();
    } catch (error: any) {
      alert(error.message || '일괄 지급완료 처리에 실패했습니다.');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('지급요청을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deletePaymentRequest(id);
      loadRequests();
      onRefresh?.();
    } catch (error: any) {
      alert(error.message || '지급요청 삭제에 실패했습니다.');
    }
  };

  const pendingRequests = requests.filter((r) => r.status === '요청중');
  const completedRequests = requests.filter((r) => r.status === '완료');
  const pendingAmount = pendingRequests.reduce((sum, r) => sum + r.amount, 0);
  const completedAmount = completedRequests.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-4">
      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">요청중 금액</div>
          <div className="text-2xl font-semibold text-yellow-600">
            ¥{pendingAmount.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">{pendingRequests.length}건</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">완료 금액</div>
          <div className="text-2xl font-semibold text-green-600">
            ¥{completedAmount.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">{completedRequests.length}건</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">전체 금액</div>
          <div className="text-2xl font-semibold text-gray-900">
            ¥{(pendingAmount + completedAmount).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">{requests.length}건</div>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="요청번호, 발주번호, 패킹코드로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filter.status || ''}
              onChange={(e) => handleStatusFilter(e.target.value as any || undefined)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">전체 상태</option>
              <option value="요청중">요청중</option>
              <option value="완료">완료</option>
            </select>
            <select
              value={filter.source_type || ''}
              onChange={(e) => handleSourceTypeFilter(e.target.value as any || undefined)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">전체 출처</option>
              <option value="purchase_order">발주관리</option>
              <option value="packing_list">패킹리스트</option>
            </select>
          </div>
        </div>
      </div>

      {/* 일괄 작업 */}
      {isAdminLevelA && selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-900">
                {selectedIds.length}개 항목 선택됨
              </span>
            </div>
            {!showBatchComplete ? (
              <button
                onClick={() => setShowBatchComplete(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                일괄 지급완료
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={batchPaymentDate}
                  onChange={(e) => setBatchPaymentDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleComplete}
                  disabled={isCompleting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
                >
                  {isCompleting ? '처리 중...' : '완료 처리'}
                </button>
                <button
                  onClick={() => setShowBatchComplete(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  취소
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 목록 */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">로딩 중...</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-8 text-gray-500">지급요청이 없습니다.</div>
      ) : (
        <div className="space-y-3">
          {isAdminLevelA && pendingRequests.length > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={handleSelectAll}
                className="text-gray-600 hover:text-gray-900"
              >
                {selectedIds.length === pendingRequests.length ? (
                  <CheckSquare className="w-5 h-5" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
              </button>
              <span className="text-sm text-gray-600">전체 선택</span>
            </div>
          )}
          {requests.map((request) => (
            <div key={request.id} className="flex items-start gap-3">
              {isAdminLevelA && request.status === '요청중' && (
                <input
                  type="checkbox"
                  checked={selectedIds.includes(request.id)}
                  onChange={() => handleToggleSelect(request.id)}
                  className="mt-4"
                />
              )}
              <div className="flex-1">
                <PaymentRequestItem
                  request={request}
                  onComplete={loadRequests}
                  onDelete={() => handleDelete(request.id)}
                  showActions={isAdminLevelA}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import type { PaymentRequestStatus, PaymentRequestSourceType } from '../../api/paymentRequestApi';

