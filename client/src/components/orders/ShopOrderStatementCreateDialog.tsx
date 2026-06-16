import { useEffect, useState } from 'react';
import { Calendar, X } from 'lucide-react';

function todayDateInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface ShopOrderStatementCreateDialogProps {
  isOpen: boolean;
  lineCount: number;
  isReservation?: boolean;
  onConfirm: (statementDate: string) => void;
  onCancel: () => void;
}

export function ShopOrderStatementCreateDialog({
  isOpen,
  lineCount,
  isReservation = false,
  onConfirm,
  onCancel,
}: ShopOrderStatementCreateDialogProps) {
  const [statementDate, setStatementDate] = useState(todayDateInputValue());

  useEffect(() => {
    if (isOpen) {
      setStatementDate(todayDateInputValue());
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const kindLabel = isReservation ? '예약' : '주문';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">명세서 작성</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-gray-600">
            선택한 {kindLabel} {lineCount.toLocaleString()}건을 상호·주소·수령인 기준으로 묶어
            명세서를 작성합니다. 같은 상호라도 작성 시점이 다르면 각각 별도 명세서로 저장됩니다.
          </p>

          <div>
            <label htmlFor="statement-date" className="block text-sm font-medium text-gray-700 mb-1">
              거래일자 (명세서 날짜)
            </label>
            <input
              id="statement-date"
              type="date"
              value={statementDate}
              onChange={(e) => setStatementDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-white"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!statementDate}
            onClick={() => onConfirm(statementDate)}
            className="px-4 py-2 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
          >
            명세서 작성
          </button>
        </div>
      </div>
    </div>
  );
}
