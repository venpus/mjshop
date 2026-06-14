import { useEffect } from 'react';
import { X } from 'lucide-react';
import { getShopBuyerImageUrl } from '../../api/shopBuyerApi';
import { BuyerAddressListDisplay } from '../buyers/BuyerAddressListDisplay';
import type { ShopBuyer } from '../buyers/types';

interface ShopBuyerInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  buyer: ShopBuyer | null;
  isLoading: boolean;
  companyName: string;
  unmatchedMessage?: string | null;
  orderLineInfo?: {
    address: string | null;
    recipientName: string | null;
    phoneNumber: string | null;
  };
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 py-2 border-b border-gray-100 last:border-0">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900 break-words">{value || '-'}</dd>
    </div>
  );
}

export function ShopBuyerInfoModal({
  isOpen,
  onClose,
  buyer,
  isLoading,
  companyName,
  unmatchedMessage,
  orderLineInfo,
}: ShopBuyerInfoModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const imageUrl = buyer?.businessRegistrationImage
    ? getShopBuyerImageUrl(buyer.businessRegistrationImage)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-buyer-info-title"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 id="shop-buyer-info-title" className="text-lg font-semibold text-gray-900">
            구매자 정보
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4">
          {isLoading ? (
            <div className="py-12 text-center text-gray-500">구매자 정보를 불러오는 중...</div>
          ) : buyer ? (
            <div className="space-y-5">
              <dl>
                <InfoRow label="상호명" value={buyer.companyName} />
                <InfoRow label="카톡 아이디" value={buyer.kakaoId ?? ''} />
                <InfoRow label="이메일" value={buyer.email ?? ''} />
                <InfoRow
                  label="사업자등록증 번호"
                  value={buyer.businessRegistrationNumber ?? ''}
                />
              </dl>

              {imageUrl && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">사업자등록증 이미지</p>
                  <a href={imageUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={imageUrl}
                      alt="사업자등록증"
                      className="max-h-48 rounded-lg border border-gray-200 object-contain bg-gray-50"
                    />
                  </a>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">택배 주소지</p>
                <BuyerAddressListDisplay addresses={buyer.addresses} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {unmatchedMessage ??
                  `「${companyName}」에 해당하는 등록 구매자를 찾을 수 없습니다.`}
              </div>
              <dl>
                <InfoRow label="상호명" value={companyName} />
              </dl>
              {orderLineInfo && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">이 주문의 배송 정보</p>
                  <dl className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2">
                    <InfoRow label="주소" value={orderLineInfo.address ?? ''} />
                    <InfoRow label="수령인" value={orderLineInfo.recipientName ?? ''} />
                    <InfoRow label="전화번호" value={orderLineInfo.phoneNumber ?? ''} />
                  </dl>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
