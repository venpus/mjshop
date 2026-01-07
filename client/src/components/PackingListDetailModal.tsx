import { useEffect } from 'react';
import { X } from 'lucide-react';
import { PackingListDetail } from './PackingListDetail';

interface PackingListDetailModalProps {
  isOpen: boolean;
  packingListId: number | null;
  onClose: () => void;
}

export function PackingListDetailModal({
  isOpen,
  packingListId,
  onClose,
}: PackingListDetailModalProps) {
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
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !packingListId) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <PackingListDetail
          packingListId={packingListId}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

