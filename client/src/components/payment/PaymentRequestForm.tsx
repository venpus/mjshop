import React, { useState } from 'react';
import { X } from 'lucide-react';
import {
  CreatePaymentRequestDTO,
  PaymentRequestSourceType,
  PaymentRequestPaymentType,
} from '../../api/paymentRequestApi';

interface PaymentRequestFormProps {
  sourceType: PaymentRequestSourceType;
  sourceId: string;
  paymentType: PaymentRequestPaymentType;
  amount: number;
  sourceInfo?: {
    po_number?: string;
    packing_code?: string;
    product_name?: string;
  };
  onClose: () => void;
  onSubmit: (data: CreatePaymentRequestDTO) => Promise<void>;
}

/**
 * 지급요청 생성 폼 컴포넌트
 */
export function PaymentRequestForm({
  sourceType,
  sourceId,
  paymentType,
  amount,
  sourceInfo,
  onClose,
  onSubmit,
}: PaymentRequestFormProps) {
  const [memo, setMemo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getPaymentTypeLabel = (type: PaymentRequestPaymentType): string => {
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
    if (sourceType === 'purchase_order' && sourceInfo?.po_number) {
      return `발주번호: ${sourceInfo.po_number}`;
    }
    if (sourceType === 'packing_list' && sourceInfo?.packing_code) {
      return `패킹코드: ${sourceInfo.packing_code}`;
    }
    return sourceId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit({
        source_type: sourceType,
        source_id: sourceId,
        payment_type: paymentType,
        amount,
        memo: memo.trim() || undefined,
      });
      onClose();
    } catch (error: any) {
      alert(error.message || '지급요청 생성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">지급요청 생성</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              출처
            </label>
            <div className="text-sm text-gray-900 font-medium">{getSourceLabel()}</div>
            {sourceInfo?.product_name && (
              <div className="text-xs text-gray-500 mt-0.5">{sourceInfo.product_name}</div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              지급 유형
            </label>
            <div className="text-sm text-gray-900 font-medium">
              {getPaymentTypeLabel(paymentType)}
              {sourceType === 'purchase_order' && (
                <span className="ml-2 text-xs text-gray-500">
                  ({paymentType === 'advance' ? '선금 지급' : '잔금 지급'})
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              금액
            </label>
            <div className="text-sm font-semibold text-gray-900">¥{amount.toLocaleString()}</div>
          </div>

          <div>
            <label htmlFor="memo" className="block text-sm font-medium text-gray-700 mb-1">
              비고 (선택사항)
            </label>
            <textarea
              id="memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              placeholder="비고를 입력하세요"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? '생성 중...' : '지급요청 생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

