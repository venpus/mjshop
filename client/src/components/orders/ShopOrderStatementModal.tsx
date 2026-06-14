import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';

export interface ShopOrderStatementGroupPreview {
  id: string;
  title: string;
  html: string;
}

interface ShopOrderStatementModalProps {
  isOpen: boolean;
  html?: string;
  groups?: ShopOrderStatementGroupPreview[];
  title?: string;
  onClose: () => void;
}

export function ShopOrderStatementModal({
  isOpen,
  html,
  groups,
  title = '거래명세표',
  onClose,
}: ShopOrderStatementModalProps) {
  const resolvedGroups = useMemo(() => {
    if (groups && groups.length > 0) {
      return groups;
    }
    if (html) {
      return [{ id: 'single', title, html }];
    }
    return [];
  }, [groups, html, title]);

  const [activeGroupId, setActiveGroupId] = useState(resolvedGroups[0]?.id ?? '');

  useEffect(() => {
    if (!isOpen) return;
    setActiveGroupId(resolvedGroups[0]?.id ?? '');
  }, [isOpen, resolvedGroups]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeGroup =
    resolvedGroups.find((group) => group.id === activeGroupId) ?? resolvedGroups[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {resolvedGroups.length > 1 && (
          <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
            {resolvedGroups.map((group) => {
              const isActive = group.id === activeGroup?.id;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setActiveGroupId(group.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {group.title}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex-1 overflow-auto bg-gray-50 p-4">
          {activeGroup ? (
            <iframe
              title={activeGroup.title}
              srcDoc={activeGroup.html}
              className="w-full min-h-[70vh] bg-white border border-gray-200 rounded-lg"
            />
          ) : (
            <div className="flex items-center justify-center min-h-[40vh] text-gray-500">
              표시할 명세서가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
