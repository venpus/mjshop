import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { ManufacturingForm, documentToFormSteps, type ManufacturingFormStep } from './ManufacturingForm';
import {
  getManufacturingDocumentById,
  updateManufacturingDocument,
  getFullManufacturingImageUrl,
} from '../../api/manufacturingApi';
import { getServerOrigin } from '../../api/baseUrl';
import type { ManufacturingDocument } from '../../types/manufacturing';

function getFullImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${getServerOrigin()}${url}`;
}

export function ManufacturingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [doc, setDoc] = useState<ManufacturingDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [formSteps, setFormSteps] = useState<ManufacturingFormStep[]>([]);
  const [formProductName, setFormProductName] = useState('');
  const [formProductNameZh, setFormProductNameZh] = useState('');
  const [formQuantity, setFormQuantity] = useState(0);
  const [formFinishedImage, setFormFinishedImage] = useState<string | null>(null);
  const [formSmallPackCount, setFormSmallPackCount] = useState<number | null>(null);
  const [formQuantityPerBox, setFormQuantityPerBox] = useState<number | null>(null);
  const [formPackingListCode, setFormPackingListCode] = useState('');
  const [formBarcode, setFormBarcode] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getManufacturingDocumentById(id);
      setDoc(data);
      if (data) {
        const name = data.product_name || data.product_name_zh || '';
        setFormProductName(name);
        setFormProductNameZh(name);
        setFormQuantity(data.quantity ?? 0);
        setFormFinishedImage(data.finished_product_image);
        setFormSmallPackCount(data.small_pack_count);
        setFormQuantityPerBox(data.quantity_per_box);
        setFormPackingListCode(data.packing_list_code || '');
        setFormBarcode(data.barcode || '');
        setFormSteps(documentToFormSteps(data.steps));
      }
    } catch (err) {
      console.error(err);
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

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
      if (!id) return;
      const updated = await updateManufacturingDocument(id, {
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
    },
    [id]
  );

  // 새 공정 추가 시 자동 저장하여 step ID를 받아오면, 사진 업로드 버튼이 바로 보이도록 함
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const hasNewStep = doc ? formSteps.some((s) => !s.serverId) : false;
  useEffect(() => {
    if (!id || !doc || loading || isAutoSaving || formSteps.length === 0 || !hasNewStep) return;
    const payload = buildPayload();
    setIsAutoSaving(true);
    handleSave(payload)
      .finally(() => setIsAutoSaving(false))
      .catch(() => {});
  }, [id, doc, loading, isAutoSaving, formSteps.length, hasNewStep, buildPayload, handleSave]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  if (!id) {
    navigate('/admin/manufacturing');
    return null;
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="py-12 text-center text-gray-500">{t('common.loading')}</div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-gray-600">제조 문서를 찾을 수 없습니다.</p>
        <button
          type="button"
          onClick={() => navigate('/admin/manufacturing')}
          className="mt-2 text-purple-600 hover:underline"
        >
          목록으로
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 no-print">
        <button
          type="button"
          onClick={() => navigate('/admin/manufacturing')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          {t('manufacturing.listTitle')}
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Printer className="w-4 h-4" />
          {t('manufacturing.print')}
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
        <ManufacturingForm
          documentId={doc.id}
          initialDocument={doc}
          productName={formProductName}
          productNameZh={formProductNameZh}
          productImage={doc.product_image}
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
      </div>
    </div>
  );
}
