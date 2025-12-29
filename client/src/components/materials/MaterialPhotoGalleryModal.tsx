import { useEffect } from 'react';
import { X, Download, Image } from 'lucide-react';

interface MaterialPhotoGalleryModalProps {
  images: string[];
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onImageClick?: (imageUrl: string) => void;
}

/**
 * 부자재 사진 모아보기 모달 컴포넌트
 * PhotoGalleryModal과 유사한 구조로 모든 이미지를 한번에 보여줍니다.
 */
export function MaterialPhotoGalleryModal({
  images,
  title,
  isOpen,
  onClose,
  onImageClick,
}: MaterialPhotoGalleryModalProps) {
  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || images.length === 0) return null;

  const handleDownloadImage = async (
    e: React.MouseEvent,
    imageUrl: string,
    index: number,
  ) => {
    e.stopPropagation();
    if (imageUrl) {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${title}_${index + 1}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.error('이미지 다운로드 실패:', error);
        alert('이미지 다운로드에 실패했습니다.');
      }
    }
  };

  const handleImageClick = (imageUrl: string) => {
    if (onImageClick) {
      onImageClick(imageUrl);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-gray-900 text-lg font-semibold">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {images && images.length > 0 ? (
            <div className="grid grid-cols-5 gap-4">
              {images.map((imageUrl, index) => (
                <div
                  key={index}
                  className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border-2 border-gray-200 hover:border-purple-400 transition-all cursor-pointer group"
                  onClick={() => handleImageClick(imageUrl)}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={`${title} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Image className="w-12 h-12 text-gray-400" />
                  )}

                  {/* 다운로드 버튼 */}
                  <button
                    onClick={(e) => handleDownloadImage(e, imageUrl, index)}
                    className="absolute top-2 right-2 p-2 bg-white rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-50"
                    title="다운로드"
                  >
                    <Download className="w-4 h-4 text-purple-600" />
                  </button>

                  {/* 이미지 번호 */}
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-black bg-opacity-60 text-white text-xs rounded">
                    #{index + 1}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Image className="w-16 h-16 text-gray-400 mb-4" />
              <p className="text-gray-600">표시할 이미지가 없습니다.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

