import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ImageModalProps {
  imageUrl: string | null;
  onClose: () => void;
  /** 모달 안에서 표시할 메뉴(⋮ 드롭다운 등). 클릭 시 닫히지 않도록 내부에서 stopPropagation 처리됨 */
  actions?: React.ReactNode;
}

export function ImageModal({ imageUrl, onClose, actions }: ImageModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (imageUrl) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="이미지 크게 보기"
    >
      <div className="absolute top-4 right-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {actions}
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="닫기"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <img
        src={imageUrl}
        alt=""
        className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
