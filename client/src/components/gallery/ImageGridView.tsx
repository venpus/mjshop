import { useState, useMemo } from 'react';
import { Download, Copy, X, ChevronLeft, Image as ImageIcon, Loader2 } from 'lucide-react';
import { PurchaseOrderImage, getFullImageUrl } from '../../api/purchaseOrderApi';

interface ImageItem {
  id: string;
  url: string;
  type: string;
  label: string;
  isMainImage: boolean;
}

interface ImageGridViewProps {
  images: PurchaseOrderImage[];
  productName: string;
  poNumber: string;
  productMainImage: string | null;
  onBack: () => void;
}

const IMAGE_TYPE_LABELS: Record<string, string> = {
  factory_shipment: '공장출하',
  return_exchange: '반품교환',
  work_item: '작업항목',
  logistics: '물류정보',
  other: '기타',
};

export function ImageGridView({ images, productName, poNumber, productMainImage, onBack }: ImageGridViewProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [copying, setCopying] = useState<string | null>(null);

  // 상품 메인 이미지 + 발주 이미지 통합
  const allImages = useMemo<ImageItem[]>(() => {
    const imageList: ImageItem[] = [];
    
    // 1. 상품 메인 이미지를 첫 번째로 추가
    if (productMainImage && productMainImage.trim()) {
      imageList.push({
        id: 'main-image',
        url: productMainImage, // 이미 getFullImageUrl로 변환되어 있음
        type: 'main',
        label: '메인 이미지',
        isMainImage: true,
      });
    }
    
    // 2. 발주 이미지들을 추가
    images.forEach((img) => {
      if (img.url && img.url.trim()) {
        imageList.push({
          id: `po-${img.id}`,
          url: img.url, // 이미 getFullImageUrl로 변환되어 있을 수 있음
          type: img.type,
          label: IMAGE_TYPE_LABELS[img.type] || img.type,
          isMainImage: false,
        });
      }
    });
    
    return imageList;
  }, [productMainImage, images]);

  const handleDownload = async (e: React.MouseEvent, image: ImageItem) => {
    e.stopPropagation();
    setDownloading(image.url);

    try {
      const fullUrl = getFullImageUrl(image.url);
      const response = await fetch(fullUrl);
      if (!response.ok) throw new Error('이미지 다운로드 실패');

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const filename = image.isMainImage 
        ? `${productName}_${poNumber}_메인이미지.jpg`
        : `${productName}_${poNumber}_${image.label}_${image.id}.jpg`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('이미지 다운로드 실패:', error);
      alert('이미지 다운로드에 실패했습니다.');
    } finally {
      setDownloading(null);
    }
  };

  const handleCopy = async (e: React.MouseEvent, image: ImageItem) => {
    e.stopPropagation();
    setCopying(image.url);

    try {
      const fullUrl = getFullImageUrl(image.url);
      const response = await fetch(fullUrl);
      if (!response.ok) throw new Error('이미지 복사 실패');

      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);
      
      // 성공 메시지 (간단한 토스트)
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = '이미지가 클립보드에 복사되었습니다.';
      document.body.appendChild(toast);
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 2000);
    } catch (error) {
      console.error('이미지 복사 실패:', error);
      alert('이미지 복사에 실패했습니다. 브라우저가 클립보드 API를 지원하지 않을 수 있습니다.');
    } finally {
      setCopying(null);
    }
  };

  if (allImages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>뒤로가기</span>
        </button>
        <ImageIcon className="w-16 h-16 mb-4 text-gray-400" />
        <p className="text-lg text-gray-500">이미지가 없습니다.</p>
      </div>
    );
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>뒤로가기</span>
          </button>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{productName}</h3>
            <p className="text-sm text-gray-500">{poNumber} · {allImages.length}개 이미지</p>
          </div>
        </div>
      </div>

      {/* 이미지 그리드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {allImages.map((image) => {
          // 이미지 URL 처리: 이미 전체 URL이면 그대로 사용, 아니면 변환
          let fullUrl = image.url || '';
          if (!fullUrl) {
            console.warn('빈 이미지 URL:', image);
            return null;
          }
          
          // 이미 전체 URL이 아니면 변환 (상대 경로인 경우)
          if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://') && !fullUrl.startsWith('data:')) {
            fullUrl = getFullImageUrl(fullUrl);
          }
          
          return (
            <div
              key={image.id}
              className="group relative bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all duration-200 overflow-hidden aspect-square cursor-pointer"
              onClick={() => setSelectedImage(fullUrl)}
            >
              {/* 이미지 */}
              <img
                src={fullUrl}
                alt={`${productName} 이미지 ${image.id}`}
                className="w-full h-full object-cover bg-gray-100"
                loading="lazy"
                onLoad={() => {
                  console.log('이미지 로드 성공:', fullUrl);
                }}
                onError={(e) => {
                  console.error('이미지 로드 실패:', {
                    url: fullUrl,
                    originalUrl: image.url,
                    imageId: image.id,
                    isMainImage: image.isMainImage,
                  });
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector('.fallback-icon')) {
                    const fallback = document.createElement('div');
                    fallback.className = 'fallback-icon absolute inset-0 w-full h-full flex items-center justify-center bg-gray-100';
                    fallback.innerHTML = '<svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                    parent.appendChild(fallback);
                  }
                }}
              />

              {/* 오버레이 - 호버 시에만 표시 */}
              <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-40 transition-opacity duration-200 flex items-center justify-center gap-2 pointer-events-none z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(e, image);
                  }}
                  disabled={downloading === image.url}
                  className="opacity-0 group-hover:opacity-100 bg-white text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-opacity disabled:opacity-50 pointer-events-auto"
                  title="다운로드"
                >
                  {downloading === image.url ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(e, image);
                  }}
                  disabled={copying === image.url}
                  className="opacity-0 group-hover:opacity-100 bg-white text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-opacity disabled:opacity-50 pointer-events-auto"
                  title="복사"
                >
                  {copying === image.url ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* 이미지 타입 라벨 */}
              <div className="absolute top-2 left-2 z-20">
                <span className={`text-white text-xs px-2 py-1 rounded ${
                  image.isMainImage ? 'bg-blue-500' : 'bg-purple-500'
                }`}>
                  {image.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 이미지 확대 모달 */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 p-2"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={selectedImage}
            alt="확대 이미지"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

