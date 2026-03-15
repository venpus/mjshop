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
  Search,
  Wrench,
} from "lucide-react";
import { useRef, useState, useEffect, useMemo } from "react";
import { handleNumberInput } from "../utils/numberInputUtils";
import { useLanguage } from "../contexts/LanguageContext";

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
  shippingQuantity?: number; // 배송중 수량 (패킹리스트 출고 수량 - 한국도착 수량)
  koreaArrivedQuantity?: number; // 한국도착 수량
  packingListShippingCost?: number; // 패킹리스트 배송비
  
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
  onViewPackingListClick?: () => void; // 패킹리스트 페이지에서 이 발주만 보기 (새 탭)
  onManufacturingClick?: () => void; // 제조 문서 모달 열기
  onMainImageUpload?: (file: File) => Promise<void>; // 메인 이미지 업로드 핸들러
  
  // 편집 모드 (새 발주일 때 true)
  isEditable?: boolean;
  onProductNameChange?: (value: string) => void;
  onSizeChange?: (value: string) => void;
  onWeightChange?: (value: string) => void;
  onPackagingSizeChange?: (value: string) => void;
  packagingSize?: string;
  
  // 사용자 레벨 (C0 레벨에서 발주확인 체크박스와 취소 버튼 숨김용)
  userLevel?: 'A-SuperAdmin' | 'S: Admin' | 'B0: 중국Admin' | 'C0: 한국Admin' | 'D0: 비전 담당자';
}

export function ProductInfoSection({
  productName,
  poNumber,
  productImage,
  size,
  weight,
  packaging,
  finalUnitPrice,
  shippingQuantity,
  koreaArrivedQuantity,
  packingListShippingCost,
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
  onViewPackingListClick,
  onManufacturingClick,
  onMainImageUpload,
  isEditable = false,
  onProductNameChange,
  onSizeChange,
  onWeightChange,
  onPackagingSizeChange,
  packagingSize,
  userLevel,
}: ProductInfoSectionProps) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 포장 박스 사이즈를 3개의 필드로 관리
  const [packagingWidth, setPackagingWidth] = useState<string>('');
  const [packagingHeight, setPackagingHeight] = useState<string>('');
  const [packagingDepth, setPackagingDepth] = useState<string>('');

  // packagingSize prop이 변경되면 파싱하여 3개 필드로 분리
  useEffect(() => {
    if (packagingSize) {
      // '30x 20x15cm' 형식을 파싱
      const match = packagingSize.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*cm?/i);
      if (match) {
        setPackagingWidth(match[1]);
        setPackagingHeight(match[2]);
        setPackagingDepth(match[3]);
      } else {
        // '30x20x15' 형식도 지원
        const parts = packagingSize.split(/[x×]/).map(s => s.trim());
        if (parts.length === 3) {
          setPackagingWidth(parts[0]);
          setPackagingHeight(parts[1]);
          setPackagingDepth(parts[2].replace(/cm\s*$/i, ''));
        }
      }
    } else {
      setPackagingWidth('');
      setPackagingHeight('');
      setPackagingDepth('');
    }
  }, [packagingSize]);

  // 이미지 URL에 타임스탬프 추가 (캐시 버스팅)
  // 이미지 URL이 변경될 때마다 새로운 타임스탬프를 추가하여 브라우저 캐시 무효화
  const imageUrlWithTimestamp = useMemo(() => {
    if (!productImage) return '';
    // 기존 타임스탬프 파라미터 제거
    const urlWithoutTimestamp = productImage.split(/[?&]_t=/)[0];
    const separator = urlWithoutTimestamp.includes('?') ? '&' : '?';
    return `${urlWithoutTimestamp}${separator}_t=${Date.now()}`;
  }, [productImage]);

  // 포장 박스 사이즈 변경 핸들러
  const handlePackagingSizeChange = (newWidth: string, newHeight: string, newDepth: string) => {
    // 각 값에 대해 소수점 입력 처리
    const processedWidth = handleNumberInput(newWidth);
    const processedHeight = handleNumberInput(newHeight);
    const processedDepth = handleNumberInput(newDepth);
    
    // 상태 업데이트
    setPackagingWidth(processedWidth);
    setPackagingHeight(processedHeight);
    setPackagingDepth(processedDepth);
    
    // 모든 값이 입력되었을 때만 '가로x 세로x높이cm' 형식으로 변환하여 전달
    if (processedWidth && processedHeight && processedDepth) {
      const formatted = `${processedWidth}x ${processedHeight}x${processedDepth}cm`;
      onPackagingSizeChange?.(formatted);
    } else {
      // 하나라도 비어있으면 빈 문자열 전달
      onPackagingSizeChange?.('');
    }
  };

  const handleImageClick = () => {
    if (productImage) {
      // 이미지가 있으면 크게 보기
      onImageClick();
    } else if (onMainImageUpload) {
      // 이미지가 없고 업로드 핸들러가 있으면 파일 선택 (새 발주인 경우)
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 이미지 파일 검증
    if (!file.type.startsWith("image/")) {
      alert(t("purchaseOrder.detail.imageUploadError"));
      return;
    }

    if (onMainImageUpload) {
      try {
        await onMainImageUpload(file);
      } catch (error: any) {
        alert(error.message || t("purchaseOrder.detail.imageUploadFailed"));
      }
    }

    // input 초기화 (같은 파일을 다시 선택할 수 있도록)
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
      {/* 모바일 전용: 제품명 한 줄로 전체 표시 */}
      <div className="md:hidden mb-2 w-full min-w-0">
        <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2 rounded-lg border border-blue-200 w-full min-w-0">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-md shrink-0">
            <Package className="w-3.5 h-3.5 text-white" />
          </div>
          {isEditable ? (
            <input
              type="text"
              value={productName}
              onChange={(e) => onProductNameChange?.(e.target.value)}
              placeholder={t("purchaseOrder.detail.productNamePlaceholder")}
              className="flex-1 min-w-0 text-sm font-bold text-blue-600 px-2 py-1.5 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          ) : (
            <span className="flex-1 min-w-0 text-sm font-bold text-gray-900 overflow-x-auto whitespace-nowrap block">
              {productName || t("purchaseOrder.detail.noProductName")} ({poNumber})
            </span>
          )}
          {isEditable && <span className="text-sm font-bold text-gray-600 shrink-0">({poNumber})</span>}
        </div>
      </div>

      {/* 버튼·발주컨펌 행 (모바일: 사진첩·패킹리스트·발주컨펌 한 줄 / 데스크톱: 제품명+버튼+컨펌+취소) */}
      <div className="flex flex-nowrap items-center gap-1.5 md:flex-row md:flex-wrap md:gap-3 min-w-0 mb-4 overflow-x-auto md:overflow-visible">
        {/* 데스크톱 전용: 제품명 박스 */}
        <div className="hidden md:flex items-center gap-2 md:gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 rounded-lg border border-blue-200 min-w-0 flex-1 md:flex-initial">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-md shrink-0">
            <Package className="w-4 h-4 text-white" />
          </div>
          {isEditable ? (
            <div className="flex items-center gap-2 min-w-0">
              <input
                type="text"
                value={productName}
                onChange={(e) => onProductNameChange?.(e.target.value)}
                placeholder={t("purchaseOrder.detail.productNamePlaceholder")}
                className="text-xl font-bold text-blue-600 px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[200px]"
              />
              <span className="text-xl font-bold text-gray-600 shrink-0">({poNumber})</span>
            </div>
          ) : (
            <span className="text-xl font-bold text-gray-900 truncate">
              {productName || t("purchaseOrder.detail.noProductName")} ({poNumber})
            </span>
          )}
        </div>

        {/* 사진첩 버튼 */}
        <button
          onClick={onPhotoGalleryClick}
          className="flex items-center gap-1 md:gap-2 px-2 py-1.5 md:px-4 md:py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg border border-purple-200 transition-colors text-xs md:text-base shrink-0"
          title={t("purchaseOrder.detail.photoGallery")}
        >
          <Images className="w-3.5 h-3.5 md:w-5 md:h-5 shrink-0" />
          <span className="font-semibold whitespace-nowrap">{t("purchaseOrder.detail.photoGallery")}</span>
        </button>
        {onViewPackingListClick && (
          <button
            type="button"
            onClick={onViewPackingListClick}
            className="flex items-center gap-1 md:gap-2 px-2 py-1.5 md:px-4 md:py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-colors text-xs md:text-base shrink-0"
            title={t("purchaseOrder.list.packingListSearch")}
          >
            <Search className="w-3.5 h-3.5 md:w-5 md:h-5 shrink-0" />
            <span className="font-semibold whitespace-nowrap">{t("purchaseOrder.detail.packingList")}</span>
          </button>
        )}
        {onManufacturingClick && (
          <button
            type="button"
            onClick={onManufacturingClick}
            className="flex items-center gap-1 md:gap-2 px-2 py-1.5 md:px-4 md:py-3 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-200 transition-colors text-xs md:text-base shrink-0"
            title={t("purchaseOrder.detail.manufacturing")}
          >
            <Wrench className="w-3.5 h-3.5 md:w-5 md:h-5 shrink-0" />
            <span className="font-semibold whitespace-nowrap">{t("purchaseOrder.detail.manufacturing")}</span>
          </button>
        )}

        {/* 발주 컨펌 체크박스 (C0 레벨에서는 숨김) */}
        {userLevel !== 'C0: 한국Admin' && (
          <label
            className={`flex items-center gap-1.5 md:gap-3 px-2 py-1.5 md:px-4 md:py-2 rounded-lg cursor-pointer transition-all shrink-0 ${
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
              className="w-3.5 h-3.5 md:w-5 md:h-5 cursor-pointer accent-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span
              className={`font-semibold text-xs md:text-base whitespace-nowrap ${
                isOrderConfirmed ? "text-green-800" : "text-orange-800"
              }`}
            >
              {isOrderConfirmed ? t("purchaseOrder.detail.orderConfirm") : t("purchaseOrder.detail.confirmWaiting")}
            </span>
          </label>
        )}
        {userLevel !== "C0: 한국Admin" && orderStatus !== "취소됨" && (
          <button
            onClick={onCancelOrder}
            className="hidden md:inline-flex px-3 py-1.5 md:px-4 md:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm shrink-0"
          >
            {t("purchaseOrder.list.cancel")}
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        <div className="relative shrink-0">
          <div
            className={`w-24 h-24 md:w-32 md:h-32 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 transition-opacity relative group ${
              productImage ? 'cursor-pointer hover:opacity-90' : ''
            }`}
            onClick={handleImageClick}
          >
            {productImage ? (
              <>
                <img
                  src={imageUrlWithTimestamp}
                  alt={productName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"></div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 px-2 py-1 rounded">
                    {t("purchaseOrder.detail.viewLarge")}
                  </span>
                </div>
              </>
            ) : (
              <>
                <Image className="w-12 h-12 text-gray-400" />
                {onMainImageUpload && (
                  <>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-xs text-gray-500">{t("purchaseOrder.detail.imageUpload")}</span>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* 상품 정보 영역 */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div>
              {/* 첫 번째 줄: 사이즈와 무게 */}
              <div className="flex flex-wrap items-center gap-4 md:gap-6 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Ruler className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">{t("purchaseOrder.detail.size")}</span>
                    {onSizeChange ? (
                      <input
                        type="text"
                        value={size}
                        onChange={(e) => onSizeChange(e.target.value)}
                        placeholder={t("purchaseOrder.detail.sizePlaceholder")}
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
                    <span className="text-gray-600 text-sm">{t("purchaseOrder.detail.weight")}</span>
                    {onWeightChange ? (
                      <input
                        type="text"
                        value={weight}
                        onChange={(e) => onWeightChange(e.target.value)}
                        placeholder={t("purchaseOrder.detail.weightPlaceholder")}
                        className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    ) : (
                      <p className="text-gray-900">{weight ? `${weight} g` : '-'}</p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 두 번째 줄: 소포장과 포장박스 사이즈 */}
              <div className="flex flex-wrap items-center gap-4 md:gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Box className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">{t("purchaseOrder.detail.packaging")}</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={packaging}
                        onChange={(e) => {
                          const processedValue = handleNumberInput(e.target.value);
                          if (processedValue !== e.target.value) {
                            e.target.value = processedValue;
                          }
                          onPackagingChange(parseInt(processedValue) || 0);
                        }}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-gray-500 text-xs">{t("purchaseOrder.list.quantityUnit")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Box className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <span className="text-gray-600 text-sm">{t("purchaseOrder.detail.packagingBoxSize")}</span>
                    {onPackagingSizeChange ? (
                      <div className="mt-1 flex items-center gap-1">
                        <input
                          type="number"
                          value={packagingWidth}
                          onChange={(e) => handlePackagingSizeChange(e.target.value, packagingHeight, packagingDepth)}
                          placeholder={t("purchaseOrder.detail.width")}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <span className="text-gray-500 text-sm">×</span>
                        <input
                          type="number"
                          value={packagingHeight}
                          onChange={(e) => handlePackagingSizeChange(packagingWidth, e.target.value, packagingDepth)}
                          placeholder={t("purchaseOrder.detail.height")}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <span className="text-gray-500 text-sm">×</span>
                        <input
                          type="number"
                          value={packagingDepth}
                          onChange={(e) => handlePackagingSizeChange(packagingWidth, packagingHeight, e.target.value)}
                          placeholder={t("purchaseOrder.detail.depth")}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <span className="text-gray-500 text-xs">cm</span>
                      </div>
                    ) : (
                      <p className="text-gray-900">{packagingSize || '-'}</p>
                    )}
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
                    <span className="text-gray-700 text-sm font-semibold block mb-2">{t("purchaseOrder.detail.finalUnitPrice")}</span>
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg px-5 py-4 shadow-lg ring-2 ring-purple-300 ring-offset-2 ring-offset-white w-fit">
                      <div className="flex flex-col gap-1">
                        <span className="text-3xl font-extrabold text-white drop-shadow-sm">
                          ¥{finalUnitPrice.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                        {/* 패킹리스트 출고 수량이 0이면 표시 */}
                        {((shippingQuantity || 0) + (koreaArrivedQuantity || 0)) === 0 ? (
                          <span className="text-xs text-white/90">{t("purchaseOrder.list.calcIncompleteAwaiting")}</span>
                        ) : (
                          (packingListShippingCost === undefined || packingListShippingCost === 0) && (
                            <span className="text-xs text-white/90">{t("purchaseOrder.list.calcIncompleteShipping")}</span>
                          )
                        )}
                      </div>
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
                {t("purchaseOrder.detail.expectedDeliveryDate")}
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
