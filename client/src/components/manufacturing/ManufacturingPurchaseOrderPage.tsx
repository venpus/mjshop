import { useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { getServerOrigin } from '../../api/baseUrl';
import { getFullManufacturingImageUrl } from '../../api/manufacturingApi';
import { useManufacturingDocumentEditor } from '../../hooks/useManufacturingDocumentEditor';
import { ManufacturingEditorLayout } from './ManufacturingEditorLayout';
import { ManufacturingForm } from './ManufacturingForm';

interface LocationState {
  productName?: string;
  productImage?: string | null;
  quantity?: number;
  poNumber?: string;
}

function getFullImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${getServerOrigin()}${url}`;
}

export function ManufacturingPurchaseOrderPage() {
  const { purchaseOrderId } = useParams<{ purchaseOrderId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { t } = useLanguage();
  const state = (location.state as LocationState | null) ?? {};

  const returnTo = searchParams.get('returnTo') || `/admin/purchase-orders/${purchaseOrderId}`;

  const initial = useMemo(
    () => ({
      productName: state.productName ?? '',
      productImage: state.productImage ?? null,
      quantity: state.quantity ?? 0,
    }),
    [state.productName, state.productImage, state.quantity]
  );

  const editor = useManufacturingDocumentEditor(purchaseOrderId ?? '', initial);

  if (!purchaseOrderId) {
    navigate('/admin/purchase-orders', { replace: true });
    return null;
  }

  const subtitle = state.poNumber ? `PO: ${state.poNumber}` : undefined;

  return (
    <ManufacturingEditorLayout
      title={t('manufacturing.title')}
      subtitle={subtitle}
      backLabel={t('purchaseOrder.detail.backToOrder')}
      onBack={() => navigate(returnTo)}
    >
      {editor.loading ? (
        <div className="py-12 text-center text-gray-500">{t('common.loading')}</div>
      ) : (
        <ManufacturingForm
          documentId={editor.doc?.id ?? null}
          initialDocument={editor.doc}
          productName={editor.formProductName}
          productNameZh={editor.formProductNameZh}
          productImage={editor.productImage}
          quantity={editor.formQuantity}
          finishedProductImage={editor.formFinishedImage}
          smallPackCount={editor.formSmallPackCount}
          quantityPerBox={editor.formQuantityPerBox}
          packingListCode={editor.formPackingListCode}
          barcode={editor.formBarcode}
          steps={editor.formSteps}
          onProductNameChange={editor.setFormProductName}
          onProductNameZhChange={editor.setFormProductNameZh}
          onQuantityChange={editor.setFormQuantity}
          onFinishedProductImageChange={editor.setFormFinishedImage}
          onSmallPackCountChange={editor.setFormSmallPackCount}
          onQuantityPerBoxChange={editor.setFormQuantityPerBox}
          onPackingListCodeChange={editor.setFormPackingListCode}
          onBarcodeChange={editor.setFormBarcode}
          onStepsChange={editor.setFormSteps}
          onSave={async (payload) => {
            await editor.handleSave({
              ...payload,
              steps: payload.steps.map((s) => ({
                ...s,
                image_urls: s.image_urls ?? [],
              })),
            });
          }}
          getFullImageUrl={(url) => (url ? getFullImageUrl(url) : getFullManufacturingImageUrl(url))}
        />
      )}
    </ManufacturingEditorLayout>
  );
}
