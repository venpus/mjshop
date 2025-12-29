import {
  Package,
  Images,
  Image,
  Ruler,
  Weight,
  Box,
  Calendar,
  DollarSign,
  Upload,
} from "lucide-react";
import { useRef } from "react";

interface ProductInfoSectionProps {
  // 상품 기본 정보
  productName: string;
  poNumber: string;
  productImage?: string;
  
  // 상품 상세
  size: string;
  weight: string;
  packaging: number;
  finalUnitPrice?: number; // 최종 예상 단가
  
  // 날짜 정보
  orderDate: string;
  deliveryDate: string;
  
  // 상태
  isOrderConfirmed: boolean;
  orderStatus: '발주확인' | '발주 대기' | '취소됨';
  
  // 핸들러
  onPackagingChange: (value: number) => void;
  onOrderDateChange: (value: string) => void;
  onDeliveryDateChange: (value: string) => void;
  onOrderConfirmedChange: (value: boolean) => void;
  onCancelOrder: () => void;
  onProductClick?: () => void; // 제품명 링크 기능 제거로 optional로 변경
  onPhotoGalleryClick: () => void;
  onImageClick: () => void;
  onMainImageUpload?: (file: File) => Promise<void>; // 메인 이미지 업로드 핸들러
  
  // 편집 모드 (새 발주일 때 true)
  isEditable?: boolean;
  onProductNameChange?: (value: string) => void;
  onSizeChange?: (value: string) => void;
  onWeightChange?: (value: string) => void;
}

export function ProductInfoSection({
  productName,
  poNumber,
  productImage,
  size,
  weight,
  packaging,
  finalUnitPrice,
  orderDate,
  deliveryDate,
  isOrderConfirmed,
  orderStatus,
  onPackagingChange,
  onOrderDateChange,
  onDeliveryDateChange,
  onOrderConfirmedChange,
  onCancelOrder,
  onProductClick,
  onPhotoGalleryClick,
  onImageClick,
  onMainImageUpload,
  isEditable = false,
  onProductNameChange,
  onSizeChange,
  onWeightChange,
}: ProductInfoSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageClick = () => {
    if (productImage) {
      // 이미지가 있으면 크게 보기
      onImageClick();
    } else if (onMainImageUpload) {
      // 이미지가 없고 업로드 핸들러가 있으면 파일 선택
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
      } catch (error: any) {
        alert(error.message || '이미지 업로드에 실패했습니다.');
      }
    }

    // input 초기화 (같은 파일을 다시 선택할 수 있도록)
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 rounded-lg border border-blue-200">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-md">
              <Package className="w-4 h-4 text-white" />
            </div>
            {isEditable ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => onProductNameChange?.(e.target.value)}
                  placeholder="상품명을 입력하세요"
                  className="text-xl font-bold text-blue-600 px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[200px]"
                />
                <span className="text-xl font-bold text-gray-600">({poNumber})</span>
              </div>
            ) : (
              <span className="text-xl font-bold text-gray-900">
                {productName || '(상품명 없음)'} ({poNumber})
              </span>
            )}
          </div>

          {/* 사진첩 버튼 */}
          <button
            onClick={onPhotoGalleryClick}
            className="flex items-center gap-2 px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg border border-purple-200 transition-colors"
            title="사진첩"
          >
            <Images className="w-5 h-5" />
            <span className="font-semibold">사진첩</span>
          </button>
        </div>

        {/* 발주 컨펌 체크박스 */}
        <label
          className={`flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-all ${
            isOrderConfirmed
              ? "bg-green-100 border-2 border-green-500"
              : "bg-orange-100 border-2 border-orange-500"
          } ${orderStatus === '취소됨' ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input
            type="checkbox"
            checked={isOrderConfirmed}
            onChange={(e) => onOrderConfirmedChange(e.target.checked)}
            disabled={orderStatus === '취소됨'}
            className="w-5 h-5 cursor-pointer accent-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span
            className={`font-semibold ${
              isOrderConfirmed ? "text-green-800" : "text-orange-800"
            }`}
          >
            {isOrderConfirmed ? "발주 컨펌" : "발주 컨펌 대기"}
          </span>
        </label>
        
        {/* 취소 버튼 */}
        {orderStatus !== '취소됨' && (
          <button
            onClick={onCancelOrder}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
          >
            취소
          </button>
        )}
      </div>

      <div className="flex gap-6">
        <div className="relative">
          <div
            className={`w-32 h-32 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 transition-opacity relative group ${
              onMainImageUpload ? 'cursor-pointer hover:opacity-90' : productImage ? 'cursor-pointer hover:opacity-90' : ''
            }`}
            onClick={handleImageClick}
          >
            {productImage ? (
              <>
                <img
                  src={productImage}
                  alt={productName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"></div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 px-2 py-1 rounded">
                    {onMainImageUpload ? '클릭하여 변경' : '크게 보기'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <Image className="w-12 h-12 text-gray-400" />
                {onMainImageUpload && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-xs text-gray-500">이미지 업로드</span>
                  </div>
                )}
              </>
            )}
          </div>
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

        <div className="flex-1 grid grid-cols-2 gap-6">
          {/* 상품 정보 영역 */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Ruler className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">사이즈</span>
                    {isEditable ? (
                      <input
                        type="text"
                        value={size}
                        onChange={(e) => onSizeChange?.(e.target.value)}
                        placeholder="예: 30x20x15"
                        className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    ) : (
                      <p className="text-gray-900">{size ? `${size} cm` : '-'}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Weight className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">무게</span>
                    {isEditable ? (
                      <input
                        type="text"
                        value={weight}
                        onChange={(e) => onWeightChange?.(e.target.value)}
                        placeholder="예: 500"
                        className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    ) : (
                      <p className="text-gray-900">{weight ? `${weight} g` : '-'}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Box className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">소포장</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={packaging}
                        onChange={(e) =>
                          onPackagingChange(parseInt(e.target.value) || 0)
                        }
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-gray-500 text-xs">개</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 최종 예상 단가 */}
            {finalUnitPrice !== undefined && (
              <div className="mt-4 pt-4 border-t-2 border-purple-300">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ring-purple-200">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <span className="text-gray-700 text-sm font-semibold block mb-2">최종 예상 단가</span>
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg px-5 py-4 shadow-lg ring-2 ring-purple-300 ring-offset-2 ring-offset-white w-fit">
                      <span className="text-3xl font-extrabold text-white drop-shadow-sm">
                        ¥{finalUnitPrice.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 발주일자와 납기일 영역 */}
          <div className="bg-blue-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <label
                htmlFor="orderDate"
                className="text-gray-600 text-sm flex items-center gap-2 w-28 flex-shrink-0"
              >
                <Calendar className="w-4 h-4" />
                발주일자
              </label>
              <input
                id="orderDate"
                type="date"
                value={orderDate}
                onChange={(e) => onOrderDateChange(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label
                htmlFor="deliveryDate"
                className="text-gray-600 text-sm flex items-center gap-2 w-28 flex-shrink-0"
              >
                <Calendar className="w-4 h-4" />
                예정 납기일
              </label>
              <input
                id="deliveryDate"
                type="date"
                value={deliveryDate}
                onChange={(e) => onDeliveryDateChange(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
