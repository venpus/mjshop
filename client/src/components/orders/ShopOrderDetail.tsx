import { useCallback, useEffect, useMemo, useState } from 'react';

import { useNavigate, useSearchParams } from 'react-router-dom';

import { DetailHeader } from '../DetailHeader';

import { SaveStatusBar } from '../purchase-order/SaveStatusBar';

import { GalleryImageModal } from '../GalleryImageModal';

import { ShopOrderProductSection } from './ShopOrderProductSection';

import { ShopOrderProgressPanel } from './ShopOrderProgressFields';

import { useShopLineShipmentMap } from '../../hooks/useShopLineShipmentMap';

import { ShopOrderReservationTransferModal, type ReservationTransferItem } from './ShopOrderReservationTransferModal';

import {

  addShopOrderLine,

  convertShopOrderLineToReservation,

  convertShopOrderLineToOrder,

  deleteShopOrder,

  deleteShopOrderLine,

  getShopOrderById,

  syncShopOrderDetail,

  type ShopOrder,

} from '../../api/shopOrderApi';

import { getShopBuyers, createShopBuyer, uploadShopBuyerBusinessRegistrationImage } from '../../api/shopBuyerApi';

import { getFullImageUrl } from '../../api/purchaseOrderApi';

import { useShopOrderAutoSave } from '../../hooks/useShopOrderAutoSave';

import type { ShopBuyerListItem, ShopBuyerFormData, ShopBuyerImageOptions } from '../buyers/types';
import { BuyerFormModal } from '../buyers/BuyerFormModal';

import type { ShopOrderLineForm } from '../../utils/shopOrderCalculations';
import {
  canDeleteShopOrder,
  SHOP_ORDER_DELETE_BLOCKED_MESSAGE,
} from '../../utils/shopOrderDeleteUtils';
import {
  calculateRemainingStock,
  calculateTotalOrderQuantity,
} from '../../utils/shopOrderCalculations';
import { shopOrderDetailPath, parseShopOrderListTab } from './shopOrderListNavigation';



interface ShopOrderDetailProps {

  orderId: string;

  onBack: () => void;

}



interface ShopOrderFormState {

  productName: string;

  warehouseStockQuantity: number;

  unitPrice: number | null;

  sellingPrice: number | null;

  status: ShopOrder['status'];

  orderDate: string;

  chinaInboundDate: string;

  chinaOutboundDate: string;

  koreaArrivalDate: string;

  actualArrivalDate: string;

  quantityPerBox: number;

  lines: ShopOrderLineForm[];

}



function lineToForm(
  line: ShopOrder['lines'][number],
  defaultQuantityPerBox: number
): ShopOrderLineForm {

  return {

    id: line.id,

    lineOrderNumber: line.lineOrderNumber,

    isReservation: line.isReservation,

    companyName: line.companyName ?? '',

    orderBoxCount: line.orderBoxCount,

    quantityPerBox: line.quantityPerBox || defaultQuantityPerBox,

    saleUnitPrice: line.saleUnitPrice,

    deliveryFee: line.deliveryFee,

    address: line.address ?? '',

    recipientName: line.recipientName ?? '',

    phoneNumber: line.phoneNumber ?? '',

    trackingNumber: (line.trackingNumber ?? '').replace(/\D/g, '').slice(0, 20),

    productArrived: line.productArrived,

    taxInvoiceIssued: line.taxInvoiceIssued,

    vatExempt: line.vatExempt,

    statementFilePath: line.statementFilePath,

    paymentReceived: line.paymentReceived,

    paymentProofImage: line.paymentProofImage,

  };

}



function toFormState(order: ShopOrder): ShopOrderFormState {

  return {

    productName: order.productName,

    warehouseStockQuantity: order.warehouseStockQuantity,

    unitPrice: order.unitPrice,

    sellingPrice: order.sellingPrice,

    status: order.status,

    orderDate: order.orderDate ?? '',

    chinaInboundDate: order.chinaInboundDate ?? '',

    chinaOutboundDate: order.chinaOutboundDate ?? '',

    koreaArrivalDate: order.koreaArrivalDate ?? '',

    actualArrivalDate: order.actualArrivalDate ?? '',

    quantityPerBox: order.quantityPerBox,

    lines: order.lines.map((line) => lineToForm(line, order.quantityPerBox)),

  };

}



function buildSyncPayload(form: ShopOrderFormState) {

  return {

    sellingPrice: form.sellingPrice,

    quantityPerBox: form.quantityPerBox,

    warehouseStockQuantity: form.warehouseStockQuantity,

    unitPrice: form.unitPrice,

    chinaInboundDate: form.chinaInboundDate.trim() || null,

    chinaOutboundDate: form.chinaOutboundDate.trim() || null,

    koreaArrivalDate: form.koreaArrivalDate.trim() || null,

    actualArrivalDate: form.actualArrivalDate.trim() || null,

    lines: form.lines.map((line) => ({

      id: line.id,

      companyName: line.companyName.trim() || null,

      orderBoxCount: line.orderBoxCount,

      quantityPerBox: line.quantityPerBox,

      saleUnitPrice: line.saleUnitPrice,

      deliveryFee: line.deliveryFee,

      address: line.address.trim() || null,

      recipientName: line.recipientName.trim() || null,

      phoneNumber: line.phoneNumber.trim() || null,

      trackingNumber: line.trackingNumber.replace(/\D/g, '').slice(0, 20) || null,

      productArrived: line.productArrived,

      taxInvoiceIssued: line.taxInvoiceIssued,

      vatExempt: line.vatExempt,

    })),

  };

}



export function ShopOrderDetail({ orderId, onBack }: ShopOrderDetailProps) {

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const listTab = parseShopOrderListTab(searchParams.get('tab'));

  const [order, setOrder] = useState<ShopOrder | null>(null);

  const [form, setForm] = useState<ShopOrderFormState | null>(null);

  const [originalForm, setOriginalForm] = useState<ShopOrderFormState | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [isSaving, setIsSaving] = useState(false);

  const [isLineBusy, setIsLineBusy] = useState(false);

  const [isDeletingOrder, setIsDeletingOrder] = useState(false);

  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const [transferItems, setTransferItems] = useState<ReservationTransferItem[]>([]);

  const [buyers, setBuyers] = useState<ShopBuyerListItem[]>([]);

  const [isRefreshingBuyers, setIsRefreshingBuyers] = useState(false);

  const [buyerFormModalOpen, setBuyerFormModalOpen] = useState(false);

  const [isSubmittingBuyer, setIsSubmittingBuyer] = useState(false);

  const { lineShipmentMap, reloadLineShipmentMap } = useShopLineShipmentMap();



  const loadOrder = useCallback(async () => {

    setIsLoading(true);

    setError(null);

    try {

      const data = await getShopOrderById(orderId);

      const nextForm = toFormState(data);

      setOrder(data);

      setForm(nextForm);

      setOriginalForm(nextForm);

      await reloadLineShipmentMap();

    } catch (err) {

      setError(err instanceof Error ? err.message : '주문 정보를 불러오지 못했습니다.');

    } finally {

      setIsLoading(false);

    }

  }, [orderId, reloadLineShipmentMap]);



  const loadBuyers = useCallback(async () => {

    const data = await getShopBuyers();

    setBuyers(data);

  }, []);



  useEffect(() => {

    void loadBuyers().catch((err) => {

      console.error('구매자 목록 로드 오류:', err);

    });

  }, [loadBuyers]);



  const handleRefreshBuyers = useCallback(async () => {

    setIsRefreshingBuyers(true);

    try {

      await loadBuyers();

    } catch (err) {

      alert(err instanceof Error ? err.message : '구매자 목록을 새로고침하지 못했습니다.');

    } finally {

      setIsRefreshingBuyers(false);

    }

  }, [loadBuyers]);



  const handleBuyerFormSubmit = useCallback(

    async (form: ShopBuyerFormData, imageOptions?: ShopBuyerImageOptions) => {

      setIsSubmittingBuyer(true);

      try {

        const created = await createShopBuyer(form);

        if (imageOptions?.pendingFile) {

          await uploadShopBuyerBusinessRegistrationImage(created.id, imageOptions.pendingFile);

        }

        setBuyerFormModalOpen(false);

        await loadBuyers();

      } catch (err) {

        alert(err instanceof Error ? err.message : '구매자 등록 중 오류가 발생했습니다.');

      } finally {

        setIsSubmittingBuyer(false);

      }

    },

    [loadBuyers]

  );



  useEffect(() => {

    loadOrder();

  }, [loadOrder]);



  const isDirty = useMemo(() => {

    if (!form || !originalForm) return false;

    return JSON.stringify(form) !== JSON.stringify(originalForm);

  }, [form, originalForm]);



  const productImage = useMemo(() => {

    if (!order?.productMainImage) return '';

    return order.productMainImage.startsWith('http')

      ? order.productMainImage

      : getFullImageUrl(order.productMainImage);

  }, [order?.productMainImage]);



  const displayQuantity = useMemo(() => {
    if (!form) return 0;
    return calculateTotalOrderQuantity(form.lines);
  }, [form]);

  const displayStockQuantity = useMemo(() => {
    if (!form) return 0;
    return calculateRemainingStock(form.warehouseStockQuantity, displayQuantity);
  }, [form, displayQuantity]);



  const syncOrderState = useCallback((updated: ShopOrder) => {

    const nextForm = toFormState(updated);

    setOrder(updated);

    setForm(nextForm);

    setOriginalForm(nextForm);

  }, []);



  const handleSave = useCallback(async () => {

    if (!form || !order || isSaving || !originalForm) return;

    setIsSaving(true);

    try {

      const updated = await syncShopOrderDetail(order.id, buildSyncPayload(form));

      syncOrderState(updated);

      setLastSavedAt(new Date());

    } catch (err) {

      console.error('주문 자동 저장 오류:', err);

    } finally {

      setIsSaving(false);

    }

  }, [form, order, originalForm, isSaving, syncOrderState]);



  useShopOrderAutoSave({

    isDirty,

    isLoading,

    isSaving,

    onSave: handleSave,

  });



  const handleSellingPriceChange = (value: number | null) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            sellingPrice: value,
            lines: prev.lines.map((line) =>
              line.saleUnitPrice != null ? line : { ...line, saleUnitPrice: value }
            ),
          }
        : prev
    );
  };



  const handleQuantityPerBoxChange = (value: number) => {

    setForm((prev) => (prev ? { ...prev, quantityPerBox: value } : prev));

  };

  const handleWarehouseStockQuantityChange = (value: number) => {
    setForm((prev) => (prev ? { ...prev, warehouseStockQuantity: Math.max(0, value) } : prev));
  };

  const handleUnitPriceChange = (value: number | null) => {
    setForm((prev) => (prev ? { ...prev, unitPrice: value } : prev));
  };

  const handleLogisticsDateChange = (
    key: 'chinaInboundDate' | 'chinaOutboundDate' | 'koreaArrivalDate' | 'actualArrivalDate',
    value: string
  ) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleLineChange = <K extends keyof ShopOrderLineForm>(

    lineId: string,

    key: K,

    value: ShopOrderLineForm[K]

  ) => {

    setForm((prev) =>

      prev

        ? {

            ...prev,

            lines: prev.lines.map((line) =>

              line.id === lineId ? { ...line, [key]: value } : line

            ),

          }

        : prev

    );

  };



  const handleLineBatchChange = (lineId: string, updates: Partial<ShopOrderLineForm>) => {

    setForm((prev) =>

      prev

        ? {

            ...prev,

            lines: prev.lines.map((line) =>

              line.id === lineId ? { ...line, ...updates } : line

            ),

          }

        : prev

    );

  };



  const handleSaveIfNeeded = useCallback(async () => {

    if (!form || !order || isSaving || !originalForm) return;

    if (JSON.stringify(form) === JSON.stringify(originalForm)) return;

    setIsSaving(true);

    try {

      const updated = await syncShopOrderDetail(order.id, buildSyncPayload(form));

      syncOrderState(updated);

      setLastSavedAt(new Date());

    } finally {

      setIsSaving(false);

    }

  }, [form, order, originalForm, isSaving, syncOrderState]);



  const handleAddLine = async (isReservation: boolean) => {

    if (!order || isLineBusy) return;

    setIsLineBusy(true);

    try {

      if (isDirty) {

        await handleSaveIfNeeded();

      }

      const updated = await addShopOrderLine(order.id, { isReservation });

      syncOrderState(updated);

    } catch (err) {

      alert(
        err instanceof Error
          ? err.message
          : isReservation
            ? '예약 추가 중 오류가 발생했습니다.'
            : '주문 추가 중 오류가 발생했습니다.'
      );

    } finally {

      setIsLineBusy(false);

    }

  };



  const handleDeleteLine = async (lineId: string) => {

    if (!order || !form || isLineBusy) return;

    if (!window.confirm('이 주문을 삭제하시겠습니까?')) return;



    setIsLineBusy(true);

    try {

      const updated = await deleteShopOrderLine(order.id, lineId);

      syncOrderState(updated);

    } catch (err) {

      alert(err instanceof Error ? err.message : '주문 삭제 중 오류가 발생했습니다.');

    } finally {

      setIsLineBusy(false);

    }

  };



  const handleConvertLineToReservation = async (lineId: string) => {

    if (!order || isLineBusy) return;

    if (!window.confirm('이 주문을 예약으로 전환하시겠습니까?')) return;

    setIsLineBusy(true);

    try {

      if (isDirty) {

        await handleSaveIfNeeded();

      }

      const updated = await convertShopOrderLineToReservation(order.id, lineId);

      syncOrderState(updated);

    } catch (err) {

      alert(err instanceof Error ? err.message : '예약 전환 중 오류가 발생했습니다.');

    } finally {

      setIsLineBusy(false);

    }

  };



  const handleConvertReservationLineToOrder = async (lineId: string) => {

    if (!order || isLineBusy) return;

    if (!window.confirm('이 예약을 주문으로 전환하시겠습니까?')) return;

    setIsLineBusy(true);

    try {

      if (isDirty) {

        await handleSaveIfNeeded();

      }

      const updated = await convertShopOrderLineToOrder(order.id, lineId);

      syncOrderState(updated);

    } catch (err) {

      alert(err instanceof Error ? err.message : '주문 전환 중 오류가 발생했습니다.');

    } finally {

      setIsLineBusy(false);

    }

  };



  const handleDeleteProductOrder = async () => {
    if (!order) return;

    if (!canDeleteShopOrder(order)) {
      alert(SHOP_ORDER_DELETE_BLOCKED_MESSAGE);
      return;
    }

    if (
      !window.confirm(
        `「${order.productName}」(${order.orderNumber}) 제품 주문을 삭제하시겠습니까?`
      )
    ) {
      return;
    }

    setIsDeletingOrder(true);
    try {
      await deleteShopOrder(order.id);
      onBack();
    } catch (err) {
      alert(err instanceof Error ? err.message : '제품 주문 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeletingOrder(false);
    }
  };

  const handleBackWithConfirm = useCallback(() => {
    if (isDirty) {
      const shouldLeave = window.confirm(
        '저장되지 않은 변경사항이 있습니다. 정말로 나가시겠습니까? 변경사항이 저장되지 않습니다.'
      );
      if (!shouldLeave) return;
    }
    onBack();
  }, [isDirty, onBack]);

  const handleOpenTransferModal = async (lineId: string) => {
    if (!order || isLineBusy) return;

    const items = [{ shopOrderId: order.id, lineId }];

    if (isDirty) {
      await handleSaveIfNeeded();
    }
    setTransferItems(items);
    setIsTransferModalOpen(true);
  };

  const handleCloseTransferModal = () => {
    setIsTransferModalOpen(false);
    setTransferItems([]);
  };

  const handleReservationTransferred = (targetOrderId: string, transferredCount: number) => {
    alert(`${transferredCount.toLocaleString()}건의 예약을 선택한 주문으로 이동했습니다.`);
    navigate(shopOrderDetailPath(targetOrderId, listTab));
  };

  if (isLoading) {

    return (

      <div className="p-4 md:p-6 min-h-0 pb-8 min-w-0 max-w-full overflow-x-hidden">

        <DetailHeader onBack={handleBackWithConfirm} title="주문 상세" />

        <div className="min-h-[50vh] flex items-center justify-center">

          <div className="text-center">

            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />

            <p className="text-gray-600">주문 정보를 불러오는 중...</p>

          </div>

        </div>

      </div>

    );

  }



  if (error || !order || !form) {

    return (

      <div className="p-4 md:p-6 min-h-0 pb-8 min-w-0 max-w-full overflow-x-hidden">

        <DetailHeader onBack={handleBackWithConfirm} title="주문 상세" />

        <div className="min-h-[50vh] flex items-center justify-center">

          <div className="text-center">

            <p className="text-gray-600 mb-4">{error || '주문을 찾을 수 없습니다.'}</p>

            <button

              type="button"

              onClick={handleBackWithConfirm}

              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"

            >

              목록으로 돌아가기

            </button>

          </div>

        </div>

      </div>

    );

  }



  return (

    <div className="p-4 md:p-6 min-h-0 pb-8 min-w-0 max-w-full overflow-x-hidden">

      <DetailHeader
        onBack={handleBackWithConfirm}
        onDelete={() => void handleDeleteProductOrder()}
        deleteDisabled={isDeletingOrder}
        title="주문 상세"
      />



      <SaveStatusBar isDirty={isDirty} isSaving={isSaving} lastSavedAt={lastSavedAt} />



      <ShopOrderProductSection

        productName={form.productName}

        orderNumber={order.orderNumber}

        productImage={productImage}

        orderQuantity={displayQuantity}

        warehouseStockQuantity={form.warehouseStockQuantity}

        remainingStockQuantity={displayStockQuantity}

        sellingPrice={form.sellingPrice}

        quantityPerBox={form.quantityPerBox}

        unitPrice={form.unitPrice}

        orderDate={form.orderDate}

        chinaInboundDate={form.chinaInboundDate}

        chinaOutboundDate={form.chinaOutboundDate}

        koreaArrivalDate={form.koreaArrivalDate}

        actualArrivalDate={form.actualArrivalDate}

        purchaseOrderProductSize={order.purchaseOrderProductSize}

        purchaseOrderProductWeight={order.purchaseOrderProductWeight}

        purchaseOrderProductPackagingSize={order.purchaseOrderProductPackagingSize}

        status={form.status}

        purchaseOrderId={order.purchaseOrderId}

        onImageClick={() => setIsImageModalOpen(true)}

        onPurchaseOrderClick={

          order.purchaseOrderId

            ? () => navigate(`/admin/purchase-orders/${order.purchaseOrderId}`)

            : undefined

        }

        onWarehouseStockQuantityChange={handleWarehouseStockQuantityChange}

        onUnitPriceChange={handleUnitPriceChange}

        onSellingPriceChange={handleSellingPriceChange}

        onQuantityPerBoxChange={handleQuantityPerBoxChange}

        onLogisticsDateChange={handleLogisticsDateChange}

      />



      <div className="mt-4 md:mt-6">

        <ShopOrderProgressPanel

          lines={form.lines}

          quantityPerBox={form.quantityPerBox}

          buyers={buyers}

          orderId={order.id}

          isLineBusy={isLineBusy}

          onAddLine={() => void handleAddLine(false)}

          onAddReservation={() => void handleAddLine(true)}

          onDeleteLine={handleDeleteLine}

          onConvertLineToReservation={(lineId) => void handleConvertLineToReservation(lineId)}

          onConvertReservationLineToOrder={(lineId) => void handleConvertReservationLineToOrder(lineId)}

          onTransferReservationLine={(lineId) => void handleOpenTransferModal(lineId)}

          onLineChange={handleLineChange}

          onLineBatchChange={handleLineBatchChange}

          onOrderUpdated={syncOrderState}

          onSaveIfNeeded={handleSaveIfNeeded}

          lineShipmentMap={lineShipmentMap}

          onRefreshBuyers={() => void handleRefreshBuyers()}

          onOpenAddBuyer={() => setBuyerFormModalOpen(true)}

          isRefreshingBuyers={isRefreshingBuyers}

        />

      </div>



      {isImageModalOpen && productImage && (

        <GalleryImageModal imageUrl={productImage} onClose={() => setIsImageModalOpen(false)} />

      )}

      {isTransferModalOpen && (
        <ShopOrderReservationTransferModal
          isOpen={isTransferModalOpen}
          items={transferItems}
          productName={form.productName}
          onClose={handleCloseTransferModal}
          onTransferred={handleReservationTransferred}
        />
      )}

      <BuyerFormModal
        isOpen={buyerFormModalOpen}
        buyer={null}
        isSubmitting={isSubmittingBuyer}
        onClose={() => {
          if (isSubmittingBuyer) return;
          setBuyerFormModalOpen(false);
        }}
        onSubmit={handleBuyerFormSubmit}
      />

    </div>

  );

}


