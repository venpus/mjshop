import { X } from "lucide-react";

interface GalleryImageModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export function GalleryImageModal({
  imageUrl,
  onClose,
}: GalleryImageModalProps) {
  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60]"
      onClick={onClose}
    >
      <div className="relative max-w-7xl max-h-screen p-4">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
        >
          <X className="w-8 h-8" />
        </button>

        {/* 이미지 */}
        <img
          src={imageUrl}
          alt="사진 크게 보기"
          className="max-w-full max-h-[90vh] object-contain rounded-lg"
        />
      </div>
    </div>
  );
}
