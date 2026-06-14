import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { addStockInboundBatch } from '../../api/stockInboundApi';
import { PurchaseOrderInboundPicker } from './PurchaseOrderInboundPicker';

interface AddInboundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddInboundModal({ isOpen, onClose, onSuccess }: AddInboundModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    setSelectedIds(new Set());
    setSubmitError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) {
      setSubmitError('입고에 추가할 발주를 선택해 주세요.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await addStockInboundBatch([...selectedIds]);
      const skippedMsg =
        result.skipped.length > 0
          ? `\n건너뜀: ${result.skipped.map((s) => s.reason).join(', ')}`
          : '';
      if (result.created.length > 0) {
        alert(`${result.created.length}건이 입고 목록에 추가되었습니다.${skippedMsg}`);
        setSelectedIds(new Set());
        onSuccess?.();
        onClose();
      } else {
        setSubmitError(result.skipped[0]?.reason || '입고 추가에 실패했습니다.');
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '입고 추가에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} aria-hidden />
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-xl shadow-xl border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">입고 추가</h3>
            <p className="text-sm text-gray-500 mt-0.5">발주 목록에서 입고할 제품을 선택하세요.</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1">
          <PurchaseOrderInboundPicker
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
          {submitError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {submitError}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl shrink-0">
          <span className="text-sm text-gray-600">
            {selectedIds.size > 0 ? `${selectedIds.size}건 선택됨` : '발주를 선택해 주세요'}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-white transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || selectedIds.size === 0}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              입고 추가
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
