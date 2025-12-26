import { DetailHeader } from "../DetailHeader";
import { ProductInfoSection } from "../ProductInfoSection";
import { ProgressStatusSection } from "../ProgressStatusSection";
import { SaveStatusBar } from "./SaveStatusBar";
import { type WorkItem } from "../tabs/ProcessingPackagingTab";

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
  onProductClick: () => void;
  onPhotoGalleryClick: () => void;
  onImageClick: () => void;

  // ProgressStatusSection props
  currentFactoryStatus: string;
  totalShippedQuantity: number;
  totalReturnQuantity: number;
  totalReceivedQuantity: number;
  hasFactoryShipments: boolean;
  hasReturnItems: boolean;
  workStatus: string;
  workItems: WorkItem[];
  deliveryStatus: string;
  paymentStatus: string;
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
  currentFactoryStatus,
  totalShippedQuantity,
  totalReturnQuantity,
  totalReceivedQuantity,
  hasFactoryShipments,
  hasReturnItems,
  workStatus,
  workItems,
  deliveryStatus,
  paymentStatus,
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

      <div className="grid grid-cols-[2fr_1fr] gap-6">
        {/* Left Column - Main Info */}
        <div className="space-y-6">
          {/* Product Information */}
          <ProductInfoSection
            productName={productName}
            poNumber={poNumber}
            productImage={productImage}
            size={size}
            weight={weight}
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
          />
        </div>

        {/* Right Column - Status */}
        <div className="space-y-6">
          {/* Status Information */}
          <ProgressStatusSection
            currentFactoryStatus={currentFactoryStatus}
            totalShippedQuantity={totalShippedQuantity}
            totalReturnQuantity={totalReturnQuantity}
            totalReceivedQuantity={totalReceivedQuantity}
            hasFactoryShipments={hasFactoryShipments}
            hasReturnItems={hasReturnItems}
            workStatus={workStatus}
            workItems={workItems}
            deliveryStatus={deliveryStatus}
            paymentStatus={paymentStatus}
          />
        </div>
      </div>
    </>
  );
}

