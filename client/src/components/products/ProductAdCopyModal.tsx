import { useEffect, useState } from 'react';
import { Loader2, Megaphone, X } from 'lucide-react';
import { saveProductAdCopy } from '../../utils/productApiHelpers';

interface ProductAdCopyModalProps {
  productId: string;
  initialAdCopy: string | null;
  onClose: () => void;
  onSaved: (adCopy: string) => void;
}

export function ProductAdCopyModal({
  productId,
  initialAdCopy,
  onClose,
  onSaved,
}: ProductAdCopyModalProps) {
  const [text, setText] = useState(initialAdCopy ?? '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, isSaving]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveProductAdCopy(productId, text);
      onSaved(text);
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : '광고문구 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Megaphone className="w-5 h-5 text-orange-500 shrink-0" />
            <h3 className="text-base font-bold text-gray-900 truncate">
              광고문구 저장 · {productId}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0 disabled:opacity-50"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 min-h-0">
          <p className="text-sm text-gray-600 mb-3">
            광고 문구를 붙여넣은 뒤 저장하세요. 이모지·줄바꿈 형식 그대로 유지됩니다.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`예)\n🚨 유키오만큼의 대란템 시샤모 네코 키링?!!\n🎀 제품 사이즈 : 11cm\n💰 선주문 단독가 2800원! ⚡`}
            rows={18}
            className="w-full min-h-[320px] px-4 py-3 border border-gray-300 rounded-lg text-sm leading-relaxed text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-y whitespace-pre-wrap"
          />
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-semibold disabled:opacity-50"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
