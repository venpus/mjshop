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
  console.log('ProductImageCell 렌더링 - imageUrl:', imageUrl);
  
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
          className="w-full h-full object-contain"
          style={{ 
            display: 'block',
            maxWidth: '100%',
            maxHeight: '100%'
          }}
          onError={(e) => {
            console.error('❌ 이미지 로딩 실패:', imageUrl);
            console.error('이미지 요소:', e.currentTarget);
            console.error('에러 상세:', e);
            // 이미지 로딩 실패 시 아이콘 표시
            e.currentTarget.style.display = 'none';
          }}
          onLoad={(e) => {
            console.log('✅ 이미지 로딩 성공:', imageUrl);
            console.log('이미지 크기:', e.currentTarget.naturalWidth, 'x', e.currentTarget.naturalHeight);
            console.log('표시 크기:', e.currentTarget.width, 'x', e.currentTarget.height);
          }}
        />
      ) : (
        <Image className="w-8 h-8 text-gray-400" />
      )}
    </div>
  );
}

