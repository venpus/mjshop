import { X, Image, Download } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: '판매중' | '품절' | '숨김';
  size: string;
  packagingSize: string;
  weight: string;
  setCount: number;
  smallPackCount: number;
  boxCount: number;
  mainImage: string;
  images: string[];
}

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
}

export function ProductDetailModal({ product, onClose }: ProductDetailModalProps) {
  const handleDownload = async (imageUrl: string, index: number) => {
    try {
      // 이미지를 fetch로 가져오기
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Blob URL 생성
      const blobUrl = URL.createObjectURL(blob);
      
      // 다운로드 링크 생성 및 클릭
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${product.name}_${index}.jpg`;
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
          <div className="space-y-6">
            {/* Product Image */}
            <div className="flex justify-center">
              <div className="w-64 h-64 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border-2 border-gray-200">
                {product.mainImage ? (
                  <img 
                    src={product.mainImage} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Image className="w-24 h-24 text-gray-400" />
                )}
              </div>
            </div>

            {/* Product ID and Status */}
            <div>
              <p className="text-sm text-gray-600">상품 ID</p>
              <p className="text-gray-900">{product.id}</p>
            </div>

            {/* Product Name */}
            <div>
              <p className="text-sm text-gray-600 mb-1">상품명</p>
              <p className="text-gray-900">{product.name}</p>
            </div>

            {/* Two Columns Layout */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">카테고리</p>
                <p className="text-gray-900">{product.category}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">단가</p>
                <p className="text-gray-900">¥{product.price.toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">사이즈</p>
                <p className="text-gray-900">{product.size}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">포장 사이즈</p>
                <p className="text-gray-900">{product.packagingSize}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">제품 무게</p>
                <p className="text-gray-900">{product.weight}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">세트 모델수</p>
                <p className="text-gray-900">{product.setCount}개</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">소포장 입수</p>
                <p className="text-gray-900">{product.smallPackCount}개</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">한박스 입수</p>
                <p className="text-gray-900">{product.boxCount}개</p>
              </div>
            </div>

            {/* Product Images Gallery */}
            <div>
              <p className="text-sm text-gray-600 mb-3">상품 사진</p>
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 20 }).map((_, index) => {
                  const imageUrl = product.images[index % product.images.length];
                  return (
                    <div 
                      key={index}
                      className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer group"
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
                            handleDownload(imageUrl, index + 1);
                          }
                        }}
                        className="absolute top-1 right-1 p-1.5 bg-white rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-50"
                        title="다운로드"
                      >
                        <Download className="w-3.5 h-3.5 text-purple-600" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
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
  );
}