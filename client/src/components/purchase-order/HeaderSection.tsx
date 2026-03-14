import { type ReactNode } from "react";
import { DetailHeader } from "../DetailHeader";
import { ProductInfoSection } from "../ProductInfoSection";
import { SaveStatusBar } from "./SaveStatusBar";

interface HeaderSectionProps {
  // Header 관련
  onBack: () => void;
  onSave?: () => void;
  isDirty?: boolean;
  isSaving?: boolean;
  lastSavedAt?: Date | null;

  // ProductInfoSection props
  productName: string;
  poNumber: string;
  productImage?: string;
  size: string;
  weight: string;
  packagingSize?: string;
  packaging: number;
  finalUnitPrice?: number;
  orderDate: string;
  deliveryDate: string;
  isOrderConfirmed: boolean;
  orderStatus: '발주확인' | '발주 대기' | '취소됨';
  onPackagingChange: (value: number) => void;
  onOrderDateChange: (value: string) => void;
  onDeliveryDateChange: (value: string) => void;
  onOrderConfirmedChange: (value: boolean) => void;
  onCancelOrder: () => void;
  onProductClick?: () => void;
  onPhotoGalleryClick: () => void;
  onImageClick: () => void;
  onViewPackingListClick?: () => void;
  onManufacturingClick?: () => void;

  isEditable?: boolean;
  onProductNameChange?: (value: string) => void;
  onSizeChange?: (value: string) => void;
  onWeightChange?: (value: string) => void;
  onPackagingSizeChange?: (value: string) => void;
  onMainImageUpload?: (file: File) => Promise<void>;
  userLevel?: 'A-SuperAdmin' | 'S: Admin' | 'B0: 중국Admin' | 'C0: 한국Admin' | 'D0: 비전 담당자';

  /** 진행상태 대신 표시할 영역 (제조문서 + 메모 등) */
  rightColumnContent?: ReactNode;
}

export function HeaderSection({
  onBack,
  onSave,
  isDirty,
  isSaving,
  lastSavedAt,
  productName,
  poNumber,
  productImage,
  size,
  weight,
  packagingSize,
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
  onViewPackingListClick,
  onManufacturingClick,
  rightColumnContent,
  isEditable,
  onProductNameChange,
  onSizeChange,
  onWeightChange,
  onPackagingSizeChange,
  onMainImageUpload,
  userLevel,
}: HeaderSectionProps) {
  return (
    <>
      {/* Header */}
      <DetailHeader 
        onBack={onBack}
      />
      
      {/* Save Status Bar */}
      <SaveStatusBar
        onSave={onSave}
        isDirty={isDirty}
        isSaving={isSaving}
        lastSavedAt={lastSavedAt}
      />

      <div className={`grid gap-4 md:gap-6 ${rightColumnContent ? "grid-cols-1 md:grid-cols-[2fr_1fr]" : "grid-cols-1"}`}>
        {/* Left Column - Product Info */}
        <div className="space-y-6">
          <ProductInfoSection
            productName={productName}
            poNumber={poNumber}
            productImage={productImage}
            size={size}
            weight={weight}
            packagingSize={packagingSize}
            packaging={packaging}
            finalUnitPrice={finalUnitPrice}
            orderDate={orderDate}
            deliveryDate={deliveryDate}
            isOrderConfirmed={isOrderConfirmed}
            orderStatus={orderStatus}
            onPackagingChange={onPackagingChange}
            onOrderDateChange={onOrderDateChange}
            onDeliveryDateChange={onDeliveryDateChange}
            onOrderConfirmedChange={onOrderConfirmedChange}
            onCancelOrder={onCancelOrder}
            onProductClick={onProductClick}
            onPhotoGalleryClick={onPhotoGalleryClick}
            onImageClick={onImageClick}
            onViewPackingListClick={onViewPackingListClick}
            onManufacturingClick={onManufacturingClick}
            onMainImageUpload={onMainImageUpload}
            isEditable={isEditable}
            onProductNameChange={onProductNameChange}
            onSizeChange={onSizeChange}
            onWeightChange={onWeightChange}
            onPackagingSizeChange={onPackagingSizeChange}
            userLevel={userLevel}
          />
        </div>

        {/* Right Column - 제조문서 / 메모 (진행상태 대체) */}
        {rightColumnContent ? (
          <div className="hidden md:block space-y-6">{rightColumnContent}</div>
        ) : null}
      </div>
    </>
  );
}

