import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { BuyerAddressFields } from './BuyerAddressFields';
import { BuyerBusinessRegistrationImageUpload } from './BuyerBusinessRegistrationImageUpload';
import {
  buyerToForm,
  createEmptyForm,
  type ShopBuyer,
  type ShopBuyerFormData,
  type ShopBuyerImageOptions,
} from './types';

interface BuyerFormModalProps {
  isOpen: boolean;
  buyer: ShopBuyer | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (form: ShopBuyerFormData, imageOptions?: ShopBuyerImageOptions) => Promise<void>;
}

const inputClass =
  'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500';

export function BuyerFormModal({
  isOpen,
  buyer,
  isSubmitting,
  onClose,
  onSubmit,
}: BuyerFormModalProps) {
  const [form, setForm] = useState<ShopBuyerFormData>(createEmptyForm());
  const [imageOptions, setImageOptions] = useState<ShopBuyerImageOptions>({
    pendingFile: null,
    removeExisting: false,
  });
  const [imageUploadKey, setImageUploadKey] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setForm(buyer ? buyerToForm(buyer) : createEmptyForm());
    setImageOptions({ pendingFile: null, removeExisting: false });
    setImageUploadKey((key) => key + 1);
  }, [isOpen, buyer]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName.trim()) {
      alert('상호명을 입력해 주세요.');
      return;
    }
    await onSubmit(form, imageOptions);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {buyer ? '구매자 수정' : '구매자 등록'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상호명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.companyName}
                onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))}
                className={inputClass}
                placeholder="상호명"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">카톡 아이디</label>
              <input
                type="text"
                value={form.kakaoId}
                onChange={(e) => setForm((prev) => ({ ...prev, kakaoId: e.target.value }))}
                className={inputClass}
                placeholder="카톡 아이디"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">사업자등록증 번호</label>
              <input
                type="text"
                value={form.businessRegistrationNumber}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, businessRegistrationNumber: e.target.value }))
                }
                className={inputClass}
                placeholder="000-00-00000"
              />
            </div>
          </div>

          <BuyerBusinessRegistrationImageUpload
            key={imageUploadKey}
            imageUrl={buyer?.businessRegistrationImage ?? null}
            disabled={isSubmitting}
            onChange={setImageOptions}
          />

          <BuyerAddressFields
            addresses={form.addresses}
            onChange={(addresses) => setForm((prev) => ({ ...prev, addresses }))}
          />
        </form>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? '저장 중...' : buyer ? '수정' : '등록'}
          </button>
        </div>
      </div>
    </div>
  );
}
