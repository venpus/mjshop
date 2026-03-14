import { useState, useCallback, useRef, useMemo } from 'react';
import { Plus, Upload, Save } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { ManufacturingProductSummary } from './ManufacturingProductSummary';
import { ManufacturingStepRow } from './ManufacturingStepRow';
import {
  getFullManufacturingImageUrl,
  uploadFinishedProductImage,
  uploadStepImages,
} from '../../api/manufacturingApi';
import type { ManufacturingDocument, ManufacturingProcessStep, CreateManufacturingStepDTO } from '../../types/manufacturing';

export interface ManufacturingFormStep {
  tempId: string;
  display_order: number;
  process_name: string;
  process_name_zh: string;
  work_method: string;
  work_method_zh: string;
  image_urls: string[];
  serverId?: number;
}

interface ManufacturingFormProps {
  documentId: string | null;
  initialDocument: ManufacturingDocument | null;
  productName: string;
  productNameZh: string;
  productImage: string | null;
  quantity: number;
  finishedProductImage: string | null;
  smallPackCount: number | null;
  quantityPerBox: number | null;
  packingListCode: string;
  barcode: string;
  steps: ManufacturingFormStep[];
  onProductNameChange?: (v: string) => void;
  onProductNameZhChange?: (v: string) => void;
  onQuantityChange?: (v: number) => void;
  onFinishedProductImageChange: (v: string | null) => void;
  onSmallPackCountChange: (v: number | null) => void;
  onQuantityPerBoxChange: (v: number | null) => void;
  onPackingListCodeChange: (v: string) => void;
  onBarcodeChange: (v: string) => void;
  onStepsChange: (steps: ManufacturingFormStep[]) => void;
  onSave: (payload: {
    product_name: string;
    product_name_zh: string | null;
    quantity: number;
    finished_product_image: string | null;
    small_pack_count: number | null;
    quantity_per_box: number | null;
    packing_list_code: string | null;
    barcode: string | null;
    steps: CreateManufacturingStepDTO[];
  }) => Promise<void>;
  getFullImageUrl: (url: string | null | undefined) => string;
  readOnly?: boolean;
}

export function ManufacturingForm({
  documentId,
  initialDocument,
  productName,
  productNameZh,
  productImage,
  quantity,
  finishedProductImage,
  smallPackCount,
  quantityPerBox,
  packingListCode,
  barcode,
  steps,
  onProductNameChange,
  onProductNameZhChange,
  onQuantityChange,
  onFinishedProductImageChange,
  onSmallPackCountChange,
  onQuantityPerBoxChange,
  onPackingListCodeChange,
  onBarcodeChange,
  onStepsChange,
  onSave,
  getFullImageUrl,
  readOnly = false,
}: ManufacturingFormProps) {
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [finishedImageUploading, setFinishedImageUploading] = useState(false);
  const fileFinishedRef = useRef<HTMLInputElement>(null);

  const isDirty = useMemo(() => {
    if (!initialDocument) {
      return productName.trim() !== '';
    }
    const d = initialDocument;
    if (d.product_name !== productName) return true;
    if ((d.product_name_zh ?? '') !== (productNameZh ?? '')) return true;
    if ((d.quantity ?? 0) !== quantity) return true;
    if ((d.finished_product_image ?? null) !== (finishedProductImage ?? null)) return true;
    if ((d.small_pack_count ?? null) !== (smallPackCount ?? null)) return true;
    if ((d.quantity_per_box ?? null) !== (quantityPerBox ?? null)) return true;
    if ((d.packing_list_code ?? '') !== (packingListCode ?? '')) return true;
    if ((d.barcode ?? '') !== (barcode ?? '')) return true;
    const savedSteps = d.steps ?? [];
    if (steps.length !== savedSteps.length) return true;
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const saved = savedSteps[i];
      if (!saved) return true;
      if ((saved.process_name ?? '') !== (s.process_name ?? '')) return true;
      if ((saved.process_name_zh ?? '') !== (s.process_name_zh ?? '')) return true;
      if ((saved.work_method ?? '') !== (s.work_method ?? '')) return true;
      if ((saved.work_method_zh ?? '') !== (s.work_method_zh ?? '')) return true;
      const savedUrls = (saved.images ?? []).map((img) => img.image_url);
      if (savedUrls.length !== (s.image_urls?.length ?? 0)) return true;
      if ((s.image_urls ?? []).some((url, j) => savedUrls[j] !== url)) return true;
    }
    return false;
  }, [
    initialDocument,
    productName,
    productNameZh,
    quantity,
    finishedProductImage,
    smallPackCount,
    quantityPerBox,
    packingListCode,
    barcode,
    steps,
  ]);

  const handleAddStep = useCallback(() => {
    const nextOrder = steps.length > 0 ? Math.max(...steps.map((s) => s.display_order)) + 1 : 1;
    onStepsChange([
      ...steps,
      {
        tempId: `step-${Date.now()}`,
        display_order: nextOrder,
        process_name: '',
        process_name_zh: '',
        work_method: '',
        work_method_zh: '',
        image_urls: [],
      },
    ]);
  }, [steps, onStepsChange]);

  const handleRemoveStep = useCallback(
    (tempId: string) => {
      onStepsChange(steps.filter((s) => s.tempId !== tempId));
    },
    [steps, onStepsChange]
  );

  const handleStepChange = useCallback(
    (tempId: string, field: keyof ManufacturingFormStep, value: any) => {
      onStepsChange(
        steps.map((s) => (s.tempId === tempId ? { ...s, [field]: value } : s))
      );
    },
    [steps, onStepsChange]
  );

  const handleStepUnifiedChange = useCallback(
    (tempId: string, kind: 'name' | 'method', value: string) => {
      onStepsChange(
        steps.map((s) =>
          s.tempId === tempId
            ? kind === 'name'
              ? { ...s, process_name: value, process_name_zh: value }
              : { ...s, work_method: value, work_method_zh: value }
            : s
        )
      );
    },
    [steps, onStepsChange]
  );

  const handleFinishedImageSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !documentId) return;
      setFinishedImageUploading(true);
      try {
        const url = await uploadFinishedProductImage(documentId, file);
        onFinishedProductImageChange(url);
      } catch (err: any) {
        alert(err.message || t('manufacturing.uploadFailed'));
      } finally {
        setFinishedImageUploading(false);
        if (e.target) e.target.value = '';
      }
    },
    [documentId, onFinishedProductImageChange, t]
  );

  const handleStepImageUpload = useCallback(
    async (step: ManufacturingFormStep, files: File[]): Promise<string[]> => {
      if (!documentId || !step.serverId || files.length === 0) return [];
      return uploadStepImages(documentId, step.serverId, files);
    },
    [documentId]
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave({
        product_name: productName,
        product_name_zh: productNameZh || null,
        quantity,
        finished_product_image: finishedProductImage || null,
        small_pack_count: smallPackCount ?? null,
        quantity_per_box: quantityPerBox ?? null,
        packing_list_code: packingListCode || null,
        barcode: barcode || null,
        steps: steps.map((s) => ({
          display_order: s.display_order,
          process_name: s.process_name,
          process_name_zh: s.process_name_zh || null,
          work_method: s.work_method || null,
          work_method_zh: s.work_method_zh || null,
          image_urls: s.image_urls,
        })),
      });
    } finally {
      setSaving(false);
    }
  }, [
    productName,
    productNameZh,
    quantity,
    finishedProductImage,
    smallPackCount,
    quantityPerBox,
    packingListCode,
    barcode,
    steps,
    onSave,
  ]);

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-gray-200">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? t('common.loading') : t('common.save')}
          </button>
        </div>
      )}

      <ManufacturingProductSummary
        productName={productName}
        productNameZh={productNameZh || null}
        productImage={productImage}
        quantity={quantity}
        getFullImageUrl={getFullImageUrl}
      />

      {(onProductNameChange || onQuantityChange) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {onProductNameChange && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('manufacturing.productNameLabel')}</label>
              <input
                type="text"
                value={productName || productNameZh}
                onChange={(e) => {
                  const v = e.target.value;
                  onProductNameChange(v);
                  onProductNameZhChange?.(v);
                }}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              />
            </div>
          )}
          {onQuantityChange && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('manufacturing.quantity')}</label>
              <input
                type="number"
                min={0}
                value={quantity}
                onChange={(e) => onQuantityChange(parseInt(e.target.value, 10) || 0)}
                disabled={readOnly}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              />
            </div>
          )}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{t('manufacturing.finishedProductImage')}</label>
        <div className="flex items-center gap-3 flex-wrap">
          {finishedProductImage && (
            <img
              src={getFullManufacturingImageUrl(finishedProductImage)}
              alt=""
              className="w-40 h-40 sm:w-48 sm:h-48 object-cover rounded-lg border border-gray-200 shadow-sm"
            />
          )}
          {!readOnly && documentId && (
            <>
              <input
                type="file"
                accept="image/*"
                ref={fileFinishedRef}
                onChange={handleFinishedImageSelect}
                className="hidden"
              />
              <button
                type="button"
                disabled={finishedImageUploading}
                onClick={() => fileFinishedRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                <Upload className="w-4 h-4" />
                {finishedImageUploading ? t('common.loading') : t('manufacturing.uploadImage')}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{t('manufacturing.smallPackCount')}</label>
          <input
            type="number"
            min={0}
            value={smallPackCount ?? ''}
            onChange={(e) => onSmallPackCountChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}
            disabled={readOnly}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{t('manufacturing.quantityPerBox')}</label>
          <input
            type="number"
            min={0}
            value={quantityPerBox ?? ''}
            onChange={(e) => onQuantityPerBoxChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}
            disabled={readOnly}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{t('manufacturing.packingListCode')}</label>
          <input
            type="text"
            value={packingListCode}
            onChange={(e) => onPackingListCodeChange(e.target.value)}
            disabled={readOnly}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            placeholder={t('manufacturing.packingListCodePlaceholder')}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{t('manufacturing.barcode')}</label>
          <input
            type="text"
            value={barcode}
            onChange={(e) => onBarcodeChange(e.target.value)}
            disabled={readOnly}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            placeholder={t('manufacturing.barcodePlaceholder')}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <label className="text-sm font-medium text-gray-700">{t('manufacturing.processSteps')}</label>
          {!readOnly && (
            <button
              type="button"
              onClick={handleAddStep}
              className="flex items-center gap-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Plus className="w-4 h-4" />
              {t('manufacturing.addStep')}
            </button>
          )}
        </div>
        <div className="space-y-3">
          {steps.map((step) => (
            <ManufacturingStepRow
              key={step.tempId}
              displayOrder={step.display_order}
              processName={step.process_name || step.process_name_zh}
              workMethod={step.work_method || step.work_method_zh}
              imageUrls={step.image_urls}
              onProcessNameChange={(v) => handleStepUnifiedChange(step.tempId, 'name', v)}
              onWorkMethodChange={(v) => handleStepUnifiedChange(step.tempId, 'method', v)}
              onImageUrlsChange={(urls) => handleStepChange(step.tempId, 'image_urls', urls)}
              onRemove={() => handleRemoveStep(step.tempId)}
              onUploadImages={step.serverId ? (files) => handleStepImageUpload(step, files) : undefined}
              disabled={readOnly}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function documentToFormSteps(steps: ManufacturingProcessStep[] | undefined): ManufacturingFormStep[] {
  if (!steps || !steps.length) return [];
  return steps.map((s, i) => ({
    tempId: `step-${s.id}-${i}`,
    display_order: s.display_order,
    process_name: s.process_name || '',
    process_name_zh: s.process_name_zh || '',
    work_method: s.work_method || '',
    work_method_zh: s.work_method_zh || '',
    image_urls: (s.images || []).map((img) => img.image_url),
    serverId: s.id,
  }));
}
