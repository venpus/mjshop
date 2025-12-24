import { Image } from 'lucide-react';

export interface ProductImageCellProps {
  /** 이미지 URL */
  imageUrl?: string | null;
  /** 상품명 (alt 텍스트용) */
  productName: string;
  /** 이미지 호버 시작 핸들러 */
  onMouseEnter: () => void;
  /** 이미지 호버 종료 핸들러 */
  onMouseLeave: () => void;
  /** 마우스 이동 핸들러 */
  onMouseMove: (e: React.MouseEvent) => void;
  /** 추가 클래스명 */
  className?: string;
  /** 셀 크기 (기본값: 10x10) */
  size?: string;
}

/**
 * 상품 이미지 셀 컴포넌트
 * 테이블 행에서 사용되는 이미지 셀입니다.
 */
export function ProductImageCell({
  imageUrl,
  productName,
  onMouseEnter,
  onMouseLeave,
  onMouseMove,
  className = '',
  size = 'w-10 h-10',
}: ProductImageCellProps) {
  return (
    <div
      className={`${size} bg-gray-100 rounded overflow-hidden flex items-center justify-center cursor-pointer ${className}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseMove={onMouseMove}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={productName}
          className="w-full h-full object-cover"
        />
      ) : (
        <Image className="w-5 h-5 text-gray-400" />
      )}
    </div>
  );
}

