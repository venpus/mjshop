import { useCallback, useEffect, useMemo, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { DetailHeader } from '../DetailHeader';

import { SaveStatusBar } from '../purchase-order/SaveStatusBar';

import { GalleryImageModal } from '../GalleryImageModal';

import { ShopOrderProductSection } from './ShopOrderProductSection';

import { ShopOrderProgressPanel } from './ShopOrderProgressFields';

import {

  addShopOrderLine,

  deleteShopOrderLine,

  getShopOrderById,

  syncShopOrderDetail,

  type ShopOrder,

} from '../../api/shopOrderApi';

import { getShopBuyers } from '../../api/shopBuyerApi';

import { getFullImageUrl } from '../../api/purchaseOrderApi';

import { useShopOrderAutoSave } from '../../hooks/useShopOrderAutoSave';

import type { ShopBuyerListItem } from '../buyers/types';

import type { ShopOrderLineForm } from '../../utils/shopOrderCalculations';
import {
  calculateRemainingStock,
  calculateTotalOrderQuantity,
} from '../../utils/shopOrderCalculations';



interface ShopOrderDetailProps {

  orderId: string;

  onBack: () => void;

}



interface ShopOrderFormState {

  productName: string;

  warehouseStockQuantity: number;

  sellingPrice: number | null;

  status: ShopOrder['status'];

  orderDate: string;

  quantityPerBox: number;

  lines: ShopOrderLineForm[];

}



function lineToForm(
  line: ShopOrder['lines'][number],
  defaultQuantityPerBox: number
): ShopOrderLineForm {

  return {

    id: line.id,

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

    statementFilePath: line.statementFilePath,

    paymentProofImage: line.paymentProofImage,

  };

}



function toFormState(order: ShopOrder): ShopOrderFormState {

  return {

    productName: order.productName,

    warehouseStockQuantity: order.warehouseStockQuantity,

    sellingPrice: order.sellingPrice,

    status: order.status,

    orderDate: order.orderDate ?? '',

    quantityPerBox: order.quantityPerBox,

    lines: order.lines.map((line) => lineToForm(line, order.quantityPerBox)),

  };

}



function buildSyncPayload(form: ShopOrderFormState) {

  return {

    sellingPrice: form.sellingPrice,

    quantityPerBox: form.quantityPerBox,

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

    })),

  };

}



export function ShopOrderDetail({ orderId, onBack }: ShopOrderDetailProps) {

  const navigate = useNavigate();

  const [order, setOrder] = useState<ShopOrder | null>(null);

  const [form, setForm] = useState<ShopOrderFormState | null>(null);

  const [originalForm, setOriginalForm] = useState<ShopOrderFormState | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [isSaving, setIsSaving] = useState(false);

  const [isLineBusy, setIsLineBusy] = useState(false);

  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const [buyers, setBuyers] = useState<ShopBuyerListItem[]>([]);



  const loadOrder = useCallback(async () => {

    setIsLoading(true);

    setError(null);

    try {

      const data = await getShopOrderById(orderId);

      const nextForm = toFormState(data);

      setOrder(data);

      setForm(nextForm);

      setOriginalForm(nextForm);

    } catch (err) {

      setError(err instanceof Error ? err.message : '주문 정보를 불러오지 못했습니다.');

    } finally {

      setIsLoading(false);

    }

  }, [orderId]);



  useEffect(() => {

    loadOrder();

  }, [loadOrder]);



  useEffect(() => {

    let cancelled = false;

    (async () => {

      try {

        const data = await getShopBuyers();

        if (!cancelled) setBuyers(data);

      } catch (err) {

        console.error('구매자 목록 로드 오류:', err);

      }

    })();

    return () => {

      cancelled = true;

    };

  }, []);



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

    if (!form || !order || isSaving) return;

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

  }, [form, order, isSaving, syncOrderState]);



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

            lines: prev.lines.map((line) => ({ ...line, saleUnitPrice: value })),

          }

        : prev

    );

  };



  const handleQuantityPerBoxChange = (value: number) => {

    setForm((prev) => (prev ? { ...prev, quantityPerBox: value } : prev));

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

    if (!form || !order || isSaving) return;

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



  const handleAddLine = async () => {

    if (!order || isLineBusy) return;

    setIsLineBusy(true);

    try {

      if (isDirty) {

        await handleSaveIfNeeded();

      }

      const updated = await addShopOrderLine(order.id);

      syncOrderState(updated);

    } catch (err) {

      alert(err instanceof Error ? err.message : '주문 추가 중 오류가 발생했습니다.');

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



  if (isLoading) {

    return (

      <div className="p-4 md:p-6 min-h-[50vh] flex items-center justify-center">

        <div className="text-center">

          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />

          <p className="text-gray-600">주문 정보를 불러오는 중...</p>

        </div>

      </div>

    );

  }



  if (error || !order || !form) {

    return (

      <div className="p-6 min-h-[50vh] flex items-center justify-center">

        <div className="text-center">

          <p className="text-gray-600 mb-4">{error || '주문을 찾을 수 없습니다.'}</p>

          <button

            type="button"

            onClick={onBack}

            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"

          >

            목록으로 돌아가기

          </button>

        </div>

      </div>

    );

  }



  return (

    <div className="p-4 md:p-6 min-h-0 pb-8 min-w-0 max-w-full overflow-x-hidden">

      <DetailHeader onBack={onBack} title="주문 상세" />



      <SaveStatusBar isDirty={isDirty} isSaving={isSaving} lastSavedAt={lastSavedAt} />



      <ShopOrderProductSection

        productName={form.productName}

        orderNumber={order.orderNumber}

        productImage={productImage}

        quantity={displayQuantity}

        stockQuantity={displayStockQuantity}

        sellingPrice={form.sellingPrice}

        quantityPerBox={form.quantityPerBox}

        unitPrice={order.unitPrice}

        orderDate={form.orderDate}

        status={form.status}

        purchaseOrderId={order.purchaseOrderId}

        onImageClick={() => setIsImageModalOpen(true)}

        onPurchaseOrderClick={

          order.purchaseOrderId

            ? () => navigate(`/admin/purchase-orders/${order.purchaseOrderId}`)

            : undefined

        }

        onSellingPriceChange={handleSellingPriceChange}

        onQuantityPerBoxChange={handleQuantityPerBoxChange}

      />



      <div className="mt-4 md:mt-6">

        <ShopOrderProgressPanel

          lines={form.lines}

          quantityPerBox={form.quantityPerBox}

          buyers={buyers}

          orderId={order.id}

          isLineBusy={isLineBusy}

          onAddLine={handleAddLine}

          onDeleteLine={handleDeleteLine}

          onLineChange={handleLineChange}

          onLineBatchChange={handleLineBatchChange}

          onOrderUpdated={syncOrderState}

          onSaveIfNeeded={handleSaveIfNeeded}

        />

      </div>



      {isImageModalOpen && productImage && (

        <GalleryImageModal imageUrl={productImage} onClose={() => setIsImageModalOpen(false)} />

      )}

    </div>

  );

}


