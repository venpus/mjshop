import { useEffect } from 'react';
import { ExternalLink, FileText, X } from 'lucide-react';
import type { RelatedStatementRef } from '../../utils/shopOrderStatementReissueNotice';
import { buildStatementChangeNoticeMessage } from '../../utils/shopOrderStatementReissueNotice';

interface ShopOrderStatementChangeNoticeDialogProps {
  isOpen: boolean;
  statements: RelatedStatementRef[];
  onConfirm: () => void;
  onCancel: () => void;
  onViewStatement: (statement: RelatedStatementRef) => void;
}

export function ShopOrderStatementChangeNoticeDialog({
  isOpen,
  statements,
  onConfirm,
  onCancel,
  onViewStatement,
}: ShopOrderStatementChangeNoticeDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const message = buildStatementChangeNoticeMessage(statements.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-gray-900">명세서 변경 안내</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-gray-700 whitespace-pre-line">{message}</p>

          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 space-y-2">
            <p className="text-xs font-medium text-amber-900">관련 명세서</p>
            <ul className="space-y-2">
              {statements.map((statement) => (
                <li key={statement.groupKey}>
                  <button
                    type="button"
                    onClick={() => onViewStatement(statement)}
                    className="w-full text-left px-3 py-2 rounded-lg border border-amber-200 bg-white hover:bg-amber-50 transition-colors group"
                  >
                    <span className="flex items-start gap-2">
                      <ExternalLink className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-amber-950 group-hover:underline">
                          {statement.title}
                        </span>
                        <span className="block text-xs text-gray-600 mt-0.5 truncate">
                          {statement.orderRefsLabel}
                        </span>
                        <span className="block text-xs text-amber-800 mt-1">
                          명세서 모아보기에서 보기
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-lg bg-amber-600 text-white hover:bg-amber-700"
          >
            변경 저장
          </button>
        </div>
      </div>
    </div>
  );
}
