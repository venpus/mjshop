import { useState, useEffect } from 'react';
import { X, Download, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { Material } from './MaterialsList';
import { MaterialPhotoGalleryModal } from './MaterialPhotoGalleryModal';
import { GalleryImageModal } from '../GalleryImageModal';

interface MaterialDetailModalProps {
  material: Material;
  onClose: () => void;
}

export function MaterialDetailModal({ material, onClose }: MaterialDetailModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [photoGalleryModal, setPhotoGalleryModal] = useState<{ images: string[]; title: string } | null>(null);

  const handleDownload = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('이미지 다운로드 실패:', error);
      alert('이미지 다운로드에 실패했습니다.');
    }
  };

  const getImageExtension = (url: string): string => {
    const match = url.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i);
    return match ? match[1] : 'jpg';
  };

  const formatDate = (date: string): string => {
    try {
      const dateObj = new Date(date);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      return date;
    }
  };

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 backdrop-blur-sm bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
            <h3 className="text-gray-900 text-lg font-semibold">부자재 상세 정보</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="space-y-4">
              {/* 기본 정보 */}
              <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-md p-3">
                    <p className="text-sm font-bold text-gray-700 mb-1">번호</p>
                    <p className="text-gray-900">{material.id}</p>
                  </div>
                  <div className="bg-white rounded-md p-3">
                    <p className="text-sm font-bold text-gray-700 mb-1">날짜</p>
                    <p className="text-gray-900">{formatDate(material.date)}</p>
                  </div>
                  <div className="bg-white rounded-md p-3">
                    <p className="text-sm font-bold text-gray-700 mb-1">코드</p>
                    <p className="text-gray-900">{material.code}</p>
                  </div>
                  <div className="bg-white rounded-md p-3">
                    <p className="text-sm font-bold text-gray-700 mb-1">카테고리</p>
                    <p className="text-gray-900">{material.category}</p>
                  </div>
                </div>
              </div>

              {/* 상품 정보 */}
              <div className="bg-purple-50 rounded-lg p-4 space-y-3">
                <div className="bg-white rounded-md p-3">
                  <p className="text-sm font-bold text-gray-700 mb-1">상품명</p>
                  <p className="text-gray-900">{material.productName}</p>
                </div>
                <div className="bg-white rounded-md p-3">
                  <p className="text-sm font-bold text-gray-700 mb-1">중문상품명</p>
                  <p className="text-gray-900">{material.productNameChinese}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-md p-3">
                    <p className="text-sm font-bold text-gray-700 mb-1">종류 수</p>
                    <p className="text-gray-900">{material.typeCount}개</p>
                  </div>
                  <div className="bg-white rounded-md p-3">
                    <p className="text-sm font-bold text-gray-700 mb-1">구매완료</p>
                    <p className="text-gray-900">
                      {material.purchaseComplete ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          완료
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          미완료
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="bg-white rounded-md p-3">
                  <p className="text-sm font-bold text-gray-700 mb-1">링크</p>
                  <a
                    href={material.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                  >
                    {material.link}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* 제품 사진 */}
              {material.images && material.images.length > 0 && (
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-gray-700">제품 사진 ({material.images.length}장)</p>
                    <button
                      onClick={() => {
                        setPhotoGalleryModal({
                          images: material.images,
                          title: `${material.productName} 제품 사진`,
                        });
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      모두 보기
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {material.images.map((imageUrl, index) => (
                      <div
                        key={index}
                        className="relative aspect-square bg-white rounded-lg overflow-hidden flex items-center justify-center border-2 border-gray-200 hover:border-purple-300 transition-colors cursor-pointer group shadow-sm"
                        onClick={() => setSelectedImage(imageUrl)}
                      >
                        {imageUrl ? (
                          <>
                            <img
                              src={imageUrl}
                              alt={`${material.productName} 제품 사진 ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const ext = getImageExtension(imageUrl);
                                handleDownload(imageUrl, `${material.productName}_제품사진_${index + 1}.${ext}`);
                              }}
                              className="absolute top-2 right-2 p-2 bg-white rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-50"
                              title="다운로드"
                            >
                              <Download className="w-4 h-4 text-purple-600" />
                            </button>
                            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black bg-opacity-60 text-white text-xs rounded">
                              #{index + 1}
                            </div>
                          </>
                        ) : (
                          <ImageIcon className="w-12 h-12 text-gray-400" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 테스트 사진 */}
              {material.testImages && material.testImages.length > 0 && (
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-gray-700">테스트 사진 ({material.testImages.length}장)</p>
                    <button
                      onClick={() => {
                        setPhotoGalleryModal({
                          images: material.testImages,
                          title: `${material.productName} 테스트 사진`,
                        });
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      모두 보기
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {material.testImages.map((imageUrl, index) => (
                      <div
                        key={index}
                        className="relative aspect-square bg-white rounded-lg overflow-hidden flex items-center justify-center border-2 border-gray-200 hover:border-green-300 transition-colors cursor-pointer group shadow-sm"
                        onClick={() => setSelectedImage(imageUrl)}
                      >
                        {imageUrl ? (
                          <>
                            <img
                              src={imageUrl}
                              alt={`${material.productName} 테스트 사진 ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const ext = getImageExtension(imageUrl);
                                handleDownload(imageUrl, `${material.productName}_테스트사진_${index + 1}.${ext}`);
                              }}
                              className="absolute top-2 right-2 p-2 bg-white rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-green-50"
                              title="다운로드"
                            >
                              <Download className="w-4 h-4 text-green-600" />
                            </button>
                            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black bg-opacity-60 text-white text-xs rounded">
                              #{index + 1}
                            </div>
                          </>
                        ) : (
                          <ImageIcon className="w-12 h-12 text-gray-400" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
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

      {/* 사진 모아보기 모달 */}
      {photoGalleryModal && (
        <MaterialPhotoGalleryModal
          images={photoGalleryModal.images}
          title={photoGalleryModal.title}
          isOpen={true}
          onClose={() => setPhotoGalleryModal(null)}
          onImageClick={(imageUrl) => {
            setPhotoGalleryModal(null);
            setSelectedImage(imageUrl);
          }}
        />
      )}

      {/* 클릭 시 단일 이미지 모달 */}
      {selectedImage && (
        <GalleryImageModal
          imageUrl={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </>
  );
}

