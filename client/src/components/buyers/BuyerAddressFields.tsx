import { Plus, Trash2 } from 'lucide-react';
import {
  MAX_BUYER_ADDRESSES,
  type ShopBuyerAddress,
} from './types';

interface BuyerAddressFieldsProps {
  addresses: ShopBuyerAddress[];
  onChange: (addresses: ShopBuyerAddress[]) => void;
}

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500';

export function BuyerAddressFields({ addresses, onChange }: BuyerAddressFieldsProps) {
  const handleFieldChange = (
    index: number,
    field: keyof ShopBuyerAddress,
    value: string
  ) => {
    const next = addresses.map((addr, i) =>
      i === index ? { ...addr, [field]: value } : addr
    );
    onChange(next);
  };

  const handleAdd = () => {
    if (addresses.length >= MAX_BUYER_ADDRESSES) return;
    onChange([...addresses, { address: '', recipientName: '', phoneNumber: '' }]);
  };

  const handleRemove = (index: number) => {
    if (addresses.length <= 1) {
      onChange([{ address: '', recipientName: '', phoneNumber: '' }]);
      return;
    }
    onChange(addresses.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800">택배 주소지 등록</h4>
        <span className="text-xs text-gray-500">
          {addresses.length}/{MAX_BUYER_ADDRESSES}개
        </span>
      </div>

      {addresses.map((addr, index) => (
        <div
          key={addr.id ?? `addr-${index}`}
          className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">주소지 {index + 1}</span>
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="주소지 삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
            <div className="lg:col-span-1">
              <label className="block text-xs text-gray-500 mb-1">택배 주소지</label>
              <textarea
                value={addr.address}
                onChange={(e) => handleFieldChange(index, 'address', e.target.value)}
                className={`${inputClass} min-h-[72px] resize-y whitespace-pre-wrap break-words`}
                placeholder="배송 주소"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">수령인</label>
              <input
                type="text"
                value={addr.recipientName}
                onChange={(e) => handleFieldChange(index, 'recipientName', e.target.value)}
                className={inputClass}
                placeholder="수령인"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">전화번호</label>
              <input
                type="tel"
                value={addr.phoneNumber}
                onChange={(e) => handleFieldChange(index, 'phoneNumber', e.target.value)}
                className={inputClass}
                placeholder="010-0000-0000"
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={handleAdd}
        disabled={addresses.length >= MAX_BUYER_ADDRESSES}
        className="flex items-center gap-2 px-3 py-2 text-sm text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus className="w-4 h-4" />
        주소지 추가
      </button>
    </div>
  );
}
