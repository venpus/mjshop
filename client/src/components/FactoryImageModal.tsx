import { X } from "lucide-react";

interface FactoryImageModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export function FactoryImageModal({
  imageUrl,
  onClose,
}: FactoryImageModalProps) {
  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-8"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-full"
        onClick={(e) => e.stopPropagation()}
      >
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
          alt="업체 출고 사진 크게 보기"
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
        />
      </div>
    </div>
  );
}
