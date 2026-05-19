import { useState, useEffect, useCallback } from 'react';
import {
  getManufacturingDocumentByPurchaseOrderId,
  createManufacturingDocument,
  updateManufacturingDocument,
} from '../api/manufacturingApi';
import { documentToFormSteps, type ManufacturingFormStep } from '../components/manufacturing/ManufacturingForm';
import type { ManufacturingDocument } from '../types/manufacturing';

export interface ManufacturingEditorInitial {
  productName: string;
  productImage: string | null;
  quantity: number;
}

export function useManufacturingDocumentEditor(
  purchaseOrderId: string,
  initial: ManufacturingEditorInitial
) {
  const [doc, setDoc] = useState<ManufacturingDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [formProductName, setFormProductName] = useState(initial.productName);
  const [formProductNameZh, setFormProductNameZh] = useState('');
  const [formQuantity, setFormQuantity] = useState(initial.quantity);
  const [formFinishedImage, setFormFinishedImage] = useState<string | null>(null);
  const [formSmallPackCount, setFormSmallPackCount] = useState<number | null>(null);
  const [formQuantityPerBox, setFormQuantityPerBox] = useState<number | null>(null);
  const [formPackingListCode, setFormPackingListCode] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formSteps, setFormSteps] = useState<ManufacturingFormStep[]>([]);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const loadDoc = useCallback(async () => {
    setLoading(true);
    try {
      const existing = await getManufacturingDocumentByPurchaseOrderId(purchaseOrderId);
      if (existing) {
        setDoc(existing);
        setFormProductName(existing.product_name || initial.productName);
        setFormProductNameZh(existing.product_name_zh || '');
        setFormQuantity(existing.quantity ?? initial.quantity);
        setFormFinishedImage(existing.finished_product_image);
        setFormSmallPackCount(existing.small_pack_count);
        setFormQuantityPerBox(existing.quantity_per_box);
        setFormPackingListCode(existing.packing_list_code || '');
        setFormBarcode(existing.barcode || '');
        setFormSteps(documentToFormSteps(existing.steps));
      } else {
        setDoc(null);
        setFormProductName(initial.productName);
        setFormProductNameZh('');
        setFormQuantity(initial.quantity);
        setFormFinishedImage(null);
        setFormSmallPackCount(null);
        setFormQuantityPerBox(null);
        setFormPackingListCode('');
        setFormBarcode('');
        setFormSteps([]);
      }
    } catch {
      setDoc(null);
      setFormProductName(initial.productName);
      setFormQuantity(initial.quantity);
      setFormSteps([]);
    } finally {
      setLoading(false);
    }
  }, [purchaseOrderId, initial.productName, initial.quantity]);

  useEffect(() => {
    loadDoc();
  }, [loadDoc]);

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
    async (payload: ReturnType<typeof buildPayload>) => {
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
        return updated;
      }
      const created = await createManufacturingDocument({
        purchase_order_id: purchaseOrderId,
        product_name: payload.product_name,
        product_name_zh: payload.product_name_zh,
        product_image: initial.productImage,
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
      return created;
    },
    [doc, purchaseOrderId, initial.productImage]
  );

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

  return {
    doc,
    loading,
    productImage: initial.productImage,
    formProductName,
    formProductNameZh,
    formQuantity,
    formFinishedImage,
    formSmallPackCount,
    formQuantityPerBox,
    formPackingListCode,
    formBarcode,
    formSteps,
    setFormProductName,
    setFormProductNameZh,
    setFormQuantity,
    setFormFinishedImage,
    setFormSmallPackCount,
    setFormQuantityPerBox,
    setFormPackingListCode,
    setFormBarcode,
    setFormSteps,
    handleSave,
  };
}
