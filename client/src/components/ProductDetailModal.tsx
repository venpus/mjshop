import { useState } from 'react';
import { X, Image, Download, ExternalLink } from 'lucide-react';
import type { Product } from '../types/product';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
}

export function ProductDetailModal({ product, onClose }: ProductDetailModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleDownload = async (imageUrl: string, filename: string) => {
    try {
      // 이미지를 fetch로 가져오기
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Blob URL 생성
      const blobUrl = URL.createObjectURL(blob);
      
      // 다운로드 링크 생성 및 클릭
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // 정리
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
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h3 className="text-gray-900">상품 상세 정보</h3>
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
            {/* Product Image */}
            <div className="flex justify-center bg-purple-50 rounded-lg p-6">
              <div className="relative w-64 h-64 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border-2 border-gray-200 cursor-pointer group shadow-md">
                {product.mainImage ? (
                  <>
                    <img 
                      src={product.mainImage} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onClick={() => setSelectedImage(product.mainImage)}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (product.mainImage) {
                          const ext = getImageExtension(product.mainImage);
                          handleDownload(product.mainImage, `${product.name}_대표이미지.${ext}`);
                        }
                      }}
                      className="absolute top-2 right-2 p-2 bg-white rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-50"
                      title="다운로드"
                    >
                      <Download className="w-4 h-4 text-purple-600" />
                    </button>
                  </>
                ) : (
                  <Image className="w-24 h-24 text-gray-400" />
                )}
              </div>
            </div>

            {/* Basic Information Group */}
            <div className="bg-blue-50 rounded-lg p-4 space-y-3">
              {/* Product ID */}
              <div className="bg-white rounded-md p-3">
                <p className="text-sm font-bold text-gray-700 mb-1">상품 ID</p>
                <p className="text-gray-900">{product.id}</p>
              </div>

              {/* Category */}
              <div className="bg-white rounded-md p-3">
                <p className="text-sm font-bold text-gray-700 mb-1">카테고리</p>
                <p className="text-gray-900">{product.category}</p>
              </div>

              {/* Product Name */}
              <div className="bg-white rounded-md p-3">
                <p className="text-sm font-bold text-gray-700 mb-1">상품명</p>
                <p className="text-gray-900">
                  {product.name}
                  {product.nameChinese && (
                    <span className="text-gray-600"> ({product.nameChinese})</span>
                  )}
                </p>
              </div>
            </div>

            {/* Product Specifications Group */}
            <div className="bg-green-50 rounded-lg p-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-md p-3">
                  <p className="text-sm font-bold text-gray-700 mb-1">단가</p>
                  <p className="text-gray-900">¥{product.price.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-md p-3">
                  <p className="text-sm font-bold text-gray-700 mb-1">사이즈</p>
                  <p className="text-gray-900">{product.size || '-'}</p>
                </div>
                <div className="bg-white rounded-md p-3">
                  <p className="text-sm font-bold text-gray-700 mb-1">세트 모델수</p>
                  <p className="text-gray-900">{product.setCount}개</p>
                </div>
                <div className="bg-white rounded-md p-3">
                  <p className="text-sm font-bold text-gray-700 mb-1">무게</p>
                  <p className="text-gray-900">{product.weight ? `${product.weight}g` : '-'}</p>
                </div>
              </div>
            </div>

            {/* Product Images Gallery */}
            {product.images && product.images.length > 0 && (
              <div className="bg-orange-50 rounded-lg p-4">
                <p className="text-sm font-bold text-gray-700 mb-3">상품 사진</p>
                <div className="grid grid-cols-4 gap-3">
                  {product.images.map((imageUrl, index) => (
                    <div 
                      key={index}
                      className="relative aspect-square bg-white rounded-lg overflow-hidden flex items-center justify-center border-2 border-gray-200 hover:border-purple-300 transition-colors cursor-pointer group shadow-sm"
                      onClick={() => setSelectedImage(imageUrl)}
                    >
                      {imageUrl ? (
                        <img 
                          src={imageUrl} 
                          alt={`${product.name} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Image className="w-8 h-8 text-gray-400" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (imageUrl) {
                            const ext = getImageExtension(imageUrl);
                            handleDownload(imageUrl, `${product.name}_정보사진_${index + 1}.${ext}`);
                          }
                        }}
                        className="absolute top-1 right-1 p-1.5 bg-white rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-50"
                        title="다운로드"
                      >
                        <Download className="w-3.5 h-3.5 text-purple-600" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Supplier Information */}
            {product.supplier.name && (
              <div className="bg-yellow-50 rounded-lg p-4">
                <p className="text-sm font-bold text-gray-700 mb-2">공급상 정보</p>
                <div className="bg-white rounded-md p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900">{product.supplier.name}</span>
                    {product.supplier.url && (
                      <a
                        href={product.supplier.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:text-purple-700 flex items-center gap-1"
                        title="공급상 웹사이트 방문"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
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

      {/* Image Enlarge Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="relative max-w-7xl max-h-screen"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 닫기 버튼 */}
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>

            {/* 이미지 */}
            <img
              src={selectedImage}
              alt="이미지 크게 보기"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />

            {/* 다운로드 버튼 */}
            <div className="absolute -bottom-16 left-0 right-0 flex justify-center">
              <button
                onClick={() => {
                  if (selectedImage) {
                    const ext = getImageExtension(selectedImage);
                    const isMainImage = selectedImage === product.mainImage;
                    const filename = isMainImage 
                      ? `${product.name}_대표이미지.${ext}`
                      : `${product.name}_정보사진.${ext}`;
                    handleDownload(selectedImage, filename);
                  }
                }}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg"
              >
                <Download className="w-5 h-5" />
                <span>이미지 다운로드</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}