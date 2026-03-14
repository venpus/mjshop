import { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { ManufacturingForm, documentToFormSteps, type ManufacturingFormStep } from './ManufacturingForm';
import {
  getManufacturingDocumentByPurchaseOrderId,
  createManufacturingDocument,
  updateManufacturingDocument,
  getFullManufacturingImageUrl,
} from '../../api/manufacturingApi';
import type { ManufacturingDocument } from '../../types/manufacturing';

interface ManufacturingModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrderId: string;
  productName: string;
  productImage: string | null;
  quantity: number;
  getFullImageUrl: (url: string | null | undefined) => string;
}

export function ManufacturingModal({
  isOpen,
  onClose,
  purchaseOrderId,
  productName,
  productImage,
  quantity,
  getFullImageUrl,
}: ManufacturingModalProps) {
  const { t } = useLanguage();
  const [doc, setDoc] = useState<ManufacturingDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [formProductName, setFormProductName] = useState(productName);
  const [formProductNameZh, setFormProductNameZh] = useState('');
  const [formQuantity, setFormQuantity] = useState(quantity);
  const [formFinishedImage, setFormFinishedImage] = useState<string | null>(null);
  const [formSmallPackCount, setFormSmallPackCount] = useState<number | null>(null);
  const [formQuantityPerBox, setFormQuantityPerBox] = useState<number | null>(null);
  const [formPackingListCode, setFormPackingListCode] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formSteps, setFormSteps] = useState<ManufacturingFormStep[]>([]);

  const loadDoc = useCallback(async () => {
    setLoading(true);
    try {
      const existing = await getManufacturingDocumentByPurchaseOrderId(purchaseOrderId);
      if (existing) {
        setDoc(existing);
        setFormProductName(existing.product_name || productName);
        setFormProductNameZh(existing.product_name_zh || '');
        setFormQuantity(existing.quantity ?? quantity);
        setFormFinishedImage(existing.finished_product_image);
        setFormSmallPackCount(existing.small_pack_count);
        setFormQuantityPerBox(existing.quantity_per_box);
        setFormPackingListCode(existing.packing_list_code || '');
        setFormBarcode(existing.barcode || '');
        setFormSteps(documentToFormSteps(existing.steps));
      } else {
        setDoc(null);
        setFormProductName(productName);
        setFormProductNameZh('');
        setFormQuantity(quantity);
        setFormFinishedImage(null);
        setFormSmallPackCount(null);
        setFormQuantityPerBox(null);
        setFormPackingListCode('');
        setFormBarcode('');
        setFormSteps([]);
      }
    } catch (err) {
      console.error(err);
      setDoc(null);
      setFormProductName(productName);
      setFormQuantity(quantity);
      setFormSteps([]);
    } finally {
      setLoading(false);
    }
  }, [purchaseOrderId, productName, quantity]);

  useEffect(() => {
    if (isOpen) {
      loadDoc();
    }
  }, [isOpen, loadDoc]);

  const buildPayload = useCallback(
    () => ({
      product_name: formProductName,
      product_name_zh: formProductNameZh || null,
      quantity: formQuantity,
      finished_product_image: formFinishedImage,
      small_pack_count: formSmallPackCount,
      quantity_per_box: formQuantityPerBox,
      packing_list_code: formPackingListCode || null,
      barcode: formBarcode || null,
      steps: formSteps.map((s) => ({
        display_order: s.display_order,
        process_name: s.process_name,
        process_name_zh: s.process_name_zh || null,
        work_method: s.work_method || null,
        work_method_zh: s.work_method_zh || null,
        image_urls: s.image_urls ?? [],
      })),
    }),
    [
      formProductName,
      formProductNameZh,
      formQuantity,
      formFinishedImage,
      formSmallPackCount,
      formQuantityPerBox,
      formPackingListCode,
      formBarcode,
      formSteps,
    ]
  );

  const handleSave = useCallback(
    async (payload: {
      product_name: string;
      product_name_zh: string | null;
      quantity: number;
      finished_product_image: string | null;
      small_pack_count: number | null;
      quantity_per_box: number | null;
      packing_list_code: string | null;
      barcode: string | null;
      steps: { display_order: number; process_name: string; process_name_zh: string | null; work_method: string | null; work_method_zh: string | null; image_urls: string[] }[];
    }) => {
      if (doc) {
        const updated = await updateManufacturingDocument(doc.id, {
          product_name: payload.product_name,
          product_name_zh: payload.product_name_zh,
          quantity: payload.quantity,
          finished_product_image: payload.finished_product_image,
          small_pack_count: payload.small_pack_count,
          quantity_per_box: payload.quantity_per_box,
          packing_list_code: payload.packing_list_code,
          barcode: payload.barcode,
          steps: payload.steps,
        });
        setDoc(updated);
        setFormSteps(documentToFormSteps(updated.steps));
      } else {
        const created = await createManufacturingDocument({
          purchase_order_id: purchaseOrderId,
          product_name: payload.product_name,
          product_name_zh: payload.product_name_zh,
          product_image,
          quantity: payload.quantity,
          finished_product_image: payload.finished_product_image,
          small_pack_count: payload.small_pack_count,
          quantity_per_box: payload.quantity_per_box,
          packing_list_code: payload.packing_list_code,
          barcode: payload.barcode,
          steps: payload.steps,
        });
        setDoc(created);
        const name = created.product_name || created.product_name_zh || '';
        setFormProductName(name);
        setFormProductNameZh(name);
        setFormQuantity(created.quantity);
        setFormFinishedImage(created.finished_product_image);
        setFormSmallPackCount(created.small_pack_count);
        setFormQuantityPerBox(created.quantity_per_box);
        setFormPackingListCode(created.packing_list_code || '');
        setFormBarcode(created.barcode || '');
        setFormSteps(documentToFormSteps(created.steps));
      }
    },
    [doc, purchaseOrderId, productImage]
  );

  // 새 공정 추가 시 서버에 자동 저장하여 step ID를 받아오면, 사진 업로드 버튼이 바로 보이도록 함
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const hasNewStep = formSteps.some((s) => !s.serverId);
  useEffect(() => {
    if (loading || isAutoSaving || formSteps.length === 0 || !hasNewStep) return;
    if (!doc && !formProductName.trim()) return;
    const payload = buildPayload();
    setIsAutoSaving(true);
    handleSave(payload)
      .finally(() => setIsAutoSaving(false))
      .catch(() => {});
  }, [loading, isAutoSaving, formSteps.length, hasNewStep, doc, formProductName, buildPayload, handleSave]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl flex flex-col w-[210mm] max-w-[95vw] h-[297mm] max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{t('manufacturing.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
          {loading ? (
            <div className="py-8 text-center text-gray-500">{t('common.loading')}</div>
          ) : (
            <ManufacturingForm
              documentId={doc?.id ?? null}
              initialDocument={doc}
              productName={formProductName}
              productNameZh={formProductNameZh}
              productImage={productImage}
              quantity={formQuantity}
              finishedProductImage={formFinishedImage}
              smallPackCount={formSmallPackCount}
              quantityPerBox={formQuantityPerBox}
              packingListCode={formPackingListCode}
              barcode={formBarcode}
              steps={formSteps}
              onProductNameChange={setFormProductName}
              onProductNameZhChange={setFormProductNameZh}
              onQuantityChange={setFormQuantity}
              onFinishedProductImageChange={setFormFinishedImage}
              onSmallPackCountChange={setFormSmallPackCount}
              onQuantityPerBoxChange={setFormQuantityPerBox}
              onPackingListCodeChange={setFormPackingListCode}
              onBarcodeChange={setFormBarcode}
              onStepsChange={setFormSteps}
              onSave={handleSave}
              getFullImageUrl={(url) => (url ? getFullImageUrl(url) : getFullManufacturingImageUrl(url))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
