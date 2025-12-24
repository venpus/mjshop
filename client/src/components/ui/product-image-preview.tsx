import { Image } from 'lucide-react';

export interface ProductImagePreviewProps {
  /** 표시할 이미지 URL */
  imageUrl?: string | null;
  /** 상품명 (alt 텍스트용) */
  productName?: string;
  /** 마우스 위치 */
  mousePosition: { x: number; y: number };
  /** 프리뷰 표시 여부 */
  isVisible: boolean;
  /** 추가 클래스명 */
  className?: string;
  /** 프리뷰 크기 (기본값: 256px x 256px) */
  size?: number;
  /** 마우스와의 거리 (기본값: 20px) */
  offset?: number;
}

/**
 * 상품 이미지를 마우스 위치 근처에 확대해서 보여주는 프리뷰 컴포넌트
 */
export function ProductImagePreview({
  imageUrl,
  productName = '',
  mousePosition,
  isVisible,
  className = '',
  size = 256,
  offset = 20,
}: ProductImagePreviewProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`fixed bg-white border-2 border-gray-300 rounded-lg shadow-xl overflow-hidden flex items-center justify-center pointer-events-none z-50 ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        left: `${mousePosition.x + offset}px`,
        top: `${mousePosition.y + offset}px`,
      }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={productName}
          className="w-full h-full object-cover"
        />
      ) : (
        <Image className="w-16 h-16 text-gray-400" />
      )}
    </div>
  );
}
