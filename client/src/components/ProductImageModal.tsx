import { useEffect, useRef } from "react";
import { X, Download, Images, Upload } from "lucide-react";

interface ProductImageModalProps {
  isOpen: boolean;
  imageUrl: string | undefined;
  productName: string;
  poNumber: string;
  onClose: () => void;
  onOpenGallery: () => void;
  onMainImageUpload?: (file: File) => Promise<void>;
}

export function ProductImageModal({
  isOpen,
  imageUrl,
  productName,
  poNumber,
  onClose,
  onOpenGallery,
  onMainImageUpload,
}: ProductImageModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && imageUrl) {
        onClose();
      }
    };

    if (isOpen && imageUrl) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, imageUrl, onClose]);

  if (!isOpen || !imageUrl) return null;

  const handleDownloadImage = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${productName}_${poNumber}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("이미지 다운로드 실패:", error);
      alert("이미지 다운로드에 실패했습니다.");
    }
  };

  const handleImageChangeClick = () => {
    if (onMainImageUpload) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 이미지 파일 검증
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    if (onMainImageUpload) {
      try {
        await onMainImageUpload(file);
        // 업로드 성공 후 모달 닫기
        onClose();
      } catch (error: any) {
        alert(error.message || '이미지 업로드에 실패했습니다.');
      }
    }

    // input 초기화 (같은 파일을 다시 선택할 수 있도록)
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 고해상도 이미지 URL (Unsplash 이미지 크기 변경)
  const highResImageUrl = imageUrl.replace("w=400", "w=1200");

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
          src={highResImageUrl}
          alt={productName}
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
        />

        {/* 버튼 그룹 */}
        <div className="absolute -bottom-16 left-0 right-0 flex justify-center gap-3">
          {onMainImageUpload && (
            <button
              onClick={handleImageChangeClick}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-lg"
            >
              <Upload className="w-5 h-5" />
              <span>이미지 변경</span>
            </button>
          )}

          <button
            onClick={handleDownloadImage}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg"
          >
            <Download className="w-5 h-5" />
            <span>이미지 다운로드</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenGallery();
            }}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
          >
            <Images className="w-5 h-5" />
            <span>사진모아보기</span>
          </button>
        </div>

        {/* 파일 입력 (hidden) */}
        {onMainImageUpload && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        )}
      </div>
    </div>
  );
}
