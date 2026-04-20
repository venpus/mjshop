import { useEffect } from 'react';
import { X } from 'lucide-react';

interface VideoModalProps {
  videoUrl: string | null;
  onClose: () => void;
  actions?: React.ReactNode;
}

export function VideoModal({ videoUrl, onClose, actions }: VideoModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (videoUrl) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }
  }, [videoUrl, onClose]);

  if (!videoUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="동영상 크게 보기"
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
      <video
        src={videoUrl}
        controls
        playsInline
        className="max-w-full max-h-[90vh] w-auto h-auto rounded bg-black"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

