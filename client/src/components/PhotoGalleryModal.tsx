import { Images, X, Download, Image } from "lucide-react";

interface PhotoGalleryModalProps {
  isOpen: boolean;
  productName: string;
  poNumber: string;
  images: string[];
  onClose: () => void;
  onImageClick: (imageUrl: string) => void;
}

export function PhotoGalleryModal({
  isOpen,
  productName,
  poNumber,
  images,
  onClose,
  onImageClick,
}: PhotoGalleryModalProps) {
  if (!isOpen) return null;

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
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `${productName}_${poNumber}_${index + 1}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.error("이미지 다운로드 실패:", error);
        alert("이미지 다운로드에 실패했습니다.");
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-md">
              <Images className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-gray-900">사진 모아보기</h3>
              <p className="text-sm text-gray-600 mt-0.5">
                {productName} ({poNumber})
              </p>
            </div>
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
          <div className="grid grid-cols-5 gap-4">
            {images &&
              Array.from({ length: 20 }).map((_, index) => {
                const imageUrl = images[index % images.length];
                return (
                  <div
                    key={index}
                    className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border-2 border-gray-200 hover:border-purple-400 transition-all cursor-pointer group"
                    onClick={() => onImageClick(imageUrl)}
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={`${productName} ${index + 1}`}
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
                );
              })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
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
