import React, { useEffect } from 'react';
import { X, Maximize2, ExternalLink } from 'lucide-react';
import { PurchaseOrderDetail } from '../PurchaseOrderDetail';
import { useNavigate } from 'react-router-dom';

interface PurchaseOrderDetailModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
  returnPath?: string; // 돌아갈 경로 (결제내역)
}

/**
 * 발주 상세 페이지 모달 컴포넌트
 * 하이브리드 방식: 모달로 표시하되, 전체 화면 전환 및 새 탭 열기 옵션 제공
 */
export function PurchaseOrderDetailModal({
  orderId,
  isOpen,
  onClose,
  returnPath = '/admin/payment-history',
}: PurchaseOrderDetailModalProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  // 전체 화면으로 전환
  const handleFullscreen = () => {
    const url = `/admin/purchase-orders/${orderId}?returnPath=${encodeURIComponent(returnPath)}`;
    navigate(url);
    onClose();
  };

  // 새 탭에서 열기
  const handleOpenInNewTab = () => {
    const url = `/admin/purchase-orders/${orderId}?returnPath=${encodeURIComponent(returnPath)}`;
    window.open(url, '_blank');
  };

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // 모달이 열릴 때 body 스크롤 방지
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={(e) => {
        // 배경 클릭 시 모달 닫기
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full h-full max-w-[98vw] max-h-[98vh] bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">발주 상세</h2>
            <span className="text-sm text-gray-500">({orderId})</span>
          </div>
          <div className="flex items-center gap-2">
            {/* 전체 화면으로 보기 */}
            <button
              onClick={handleFullscreen}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="전체 화면으로 보기"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
            {/* 새 탭에서 열기 */}
            <button
              onClick={handleOpenInNewTab}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="새 탭에서 열기"
            >
              <ExternalLink className="w-5 h-5" />
            </button>
            {/* 닫기 */}
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="닫기 (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 모달 본문 - 스크롤 가능 */}
        <div className="flex-1 overflow-auto">
          <PurchaseOrderDetail
            orderId={orderId}
            onBack={onClose}
            initialTab="cost"
            autoSave={false}
          />
        </div>
      </div>
    </div>
  );
}

