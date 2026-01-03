import React, { useState } from 'react';
import { Calendar, CheckCircle, Clock, X } from 'lucide-react';
import { PaymentRequest, CompletePaymentRequestDTO } from '../../api/paymentRequestApi';
import { PaymentRequestStatusBadge } from './PaymentRequestStatusBadge';
import { completePaymentRequest } from '../../api/paymentRequestApi';
import { getLocalDateString } from '../../utils/dateUtils';
import { formatDateKST } from '../../utils/dateUtils';

interface PaymentRequestItemProps {
  request: PaymentRequest;
  onComplete?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

/**
 * 지급요청 항목 컴포넌트
 */
export function PaymentRequestItem({
  request,
  onComplete,
  onDelete,
  showActions = true,
}: PaymentRequestItemProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [paymentDate, setPaymentDate] = useState(
    getLocalDateString()
  );

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

  const handleComplete = async () => {
    if (!paymentDate) {
      alert('지급일을 입력해주세요.');
      return;
    }

    setIsCompleting(true);
    try {
      const data: CompletePaymentRequestDTO = {
        payment_date: paymentDate,
      };
      await completePaymentRequest(request.id, data);
      setShowCompleteForm(false);
      onComplete?.();
    } catch (error: any) {
      alert(error.message || '지급완료 처리에 실패했습니다.');
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900">{request.request_number}</span>
            <PaymentRequestStatusBadge status={request.status} size="xs" />
          </div>
          <div className="text-sm text-gray-600">
            {getSourceLabel()} · {getPaymentTypeLabel(request.payment_type)}
          </div>
        </div>
        <div className="text-right">
          <div className="font-semibold text-gray-900">¥{request.amount.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">
            {formatDateKST(request.request_date)}
          </div>
        </div>
      </div>

      {request.memo && (
        <div className="text-sm text-gray-600 mb-3 bg-gray-50 p-2 rounded">
          {request.memo}
        </div>
      )}

      {request.status === '완료' && request.payment_date && (
        <div className="flex items-center gap-1 text-sm text-green-600 mb-3">
          <CheckCircle className="w-4 h-4" />
          <span>지급일: {formatDateKST(request.payment_date)}</span>
        </div>
      )}

      {showActions && request.status === '요청중' && (
        <div className="flex gap-2 mt-3">
          {!showCompleteForm ? (
            <>
              <button
                onClick={() => setShowCompleteForm(true)}
                className="flex-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
              >
                <CheckCircle className="w-4 h-4" />
                지급완료
              </button>
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="px-3 py-1.5 border border-red-300 text-red-600 text-sm rounded hover:bg-red-50 transition-colors flex items-center justify-center gap-1"
                >
                  <X className="w-4 h-4" />
                  삭제
                </button>
              )}
            </>
          ) : (
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleComplete}
                  disabled={isCompleting}
                  className="flex-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isCompleting ? '처리 중...' : '완료 처리'}
                </button>
                <button
                  onClick={() => setShowCompleteForm(false)}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

