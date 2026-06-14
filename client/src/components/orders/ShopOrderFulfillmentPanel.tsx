import { useRef, useState } from 'react';
import { Download, Eye, Pencil, Trash2, Upload } from 'lucide-react';
import type { ShopOrder } from '../../api/shopOrderApi';
import {
  createShopOrderStatement,
  deleteShopOrderPaymentProof,
  downloadShopOrderStatement,
  getShopOrderStatementPreview,
  uploadShopOrderPaymentProof,
} from '../../api/shopOrderApi';
import { getFullImageUrl } from '../../api/purchaseOrderApi';
import { GalleryImageModal } from '../GalleryImageModal';
import { ShopOrderStatementModal } from './ShopOrderStatementModal';
import type { ShopOrderProgressForm } from '../../utils/shopOrderCalculations';

interface ShopOrderFulfillmentPanelProps {
  orderId: string;
  lineId: string;
  form: ShopOrderProgressForm;
  hasStatement: boolean;
  paymentProofImage: string | null;
  onChange: <K extends keyof ShopOrderProgressForm>(key: K, value: ShopOrderProgressForm[K]) => void;
  onOrderUpdated: (order: ShopOrder) => void;
  onSaveIfNeeded: () => Promise<void>;
  inputClass: string;
}

const checkboxClass =
  'w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer shrink-0';

const actionBtnClass =
  'px-1.5 py-1 text-[11px] rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0';

function InlineField({
  label,
  className = '',
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col min-w-0 shrink ${className}`}>
      <label className="text-[11px] font-medium text-gray-500 mb-0.5 truncate" title={label}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function ShopOrderFulfillmentPanel({
  orderId,
  lineId,
  form,
  hasStatement,
  paymentProofImage,
  onChange,
  onOrderUpdated,
  onSaveIfNeeded,
  inputClass,
}: ShopOrderFulfillmentPanelProps) {
  const paymentInputRef = useRef<HTMLInputElement>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [statementHtml, setStatementHtml] = useState('');
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const hasPaymentProof = Boolean(paymentProofImage);

  const handleCreateOrUpdateStatement = async () => {
    setIsBusy(true);
    try {
      await onSaveIfNeeded();
      const updated = await createShopOrderStatement(orderId, lineId);
      onOrderUpdated(updated);
      alert(hasStatement ? '명세서가 수정되었습니다.' : '명세서가 생성되었습니다.');
    } catch (err) {
      alert(err instanceof Error ? err.message : '명세서 처리 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleViewStatement = async () => {
    setIsBusy(true);
    try {
      const preview = await getShopOrderStatementPreview(orderId, lineId);
      setStatementHtml(preview.html);
      setIsStatementModalOpen(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : '명세서 보기 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleDownloadStatement = async () => {
    setIsBusy(true);
    try {
      await downloadShopOrderStatement(orderId, lineId);
    } catch (err) {
      alert(err instanceof Error ? err.message : '명세서 다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  };

  const handlePaymentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsBusy(true);
    try {
      const updated = await uploadShopOrderPaymentProof(orderId, lineId, file);
      onOrderUpdated(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : '입금 내역 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
      e.target.value = '';
    }
  };

  const handleDeletePaymentProof = async () => {
    if (!window.confirm('입금 내역 캡처 이미지를 삭제하시겠습니까?')) return;
    setIsBusy(true);
    try {
      const updated = await deleteShopOrderPaymentProof(orderId, lineId);
      onOrderUpdated(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : '입금 내역 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <>
      <InlineField label="송장" className="flex-[0.85] min-w-[48px]">
        <input
          type="text"
          inputMode="numeric"
          value={form.trackingNumber}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '').slice(0, 20);
            onChange('trackingNumber', value);
          }}
          className={`${inputClass} font-mono tabular-nums`}
          placeholder="송장"
          maxLength={20}
        />
      </InlineField>

      <InlineField label="명세서" className="flex-[1.1] min-w-[56px]">
        <div className="flex flex-nowrap items-center gap-1 min-h-[26px] overflow-hidden">
          <input
            type="checkbox"
            checked={hasStatement}
            readOnly
            disabled
            className={`${checkboxClass} cursor-default`}
          />
          {!hasStatement ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={handleCreateOrUpdateStatement}
              className={`${actionBtnClass} text-purple-700 border-purple-200 hover:bg-purple-50`}
            >
              만들기
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={isBusy}
                onClick={handleCreateOrUpdateStatement}
                className={`${actionBtnClass} text-purple-700 border-purple-200 hover:bg-purple-50`}
                title="명세서 수정"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={handleViewStatement}
                className={`${actionBtnClass} text-gray-700 border-gray-200 hover:bg-gray-50`}
              >
                명세서
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={handleDownloadStatement}
                className={`${actionBtnClass} text-gray-700 border-gray-200 hover:bg-gray-50`}
                title="다운로드"
              >
                <Download className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </InlineField>

      <InlineField label="입금" className="flex-[1] min-w-[52px]">
        <div className="flex flex-nowrap items-center gap-1 min-h-[26px] overflow-hidden">
          <input
            type="checkbox"
            checked={hasPaymentProof}
            readOnly
            disabled
            className={`${checkboxClass} cursor-default`}
          />
          <input
            ref={paymentInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            className="hidden"
            disabled={isBusy}
            onChange={handlePaymentFileChange}
          />
          {hasPaymentProof && paymentProofImage && (
            <button
              type="button"
              onClick={() => setPreviewImageUrl(getFullImageUrl(paymentProofImage))}
              className={`${actionBtnClass} text-gray-700 border-gray-200 hover:bg-gray-50 px-1.5`}
              title="입금 내역 보기"
            >
              <Eye className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            disabled={isBusy}
            onClick={() => paymentInputRef.current?.click()}
            className={`${actionBtnClass} text-purple-700 border-purple-200 hover:bg-purple-50`}
          >
            <span className="inline-flex items-center gap-0.5">
              <Upload className="w-3 h-3" />
              {hasPaymentProof ? '변경' : '업로드'}
            </span>
          </button>
          {hasPaymentProof && (
            <button
              type="button"
              disabled={isBusy}
              onClick={handleDeletePaymentProof}
              className={`${actionBtnClass} text-red-600 border-red-200 hover:bg-red-50`}
              title="삭제"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </InlineField>

      <InlineField label="도착" className="flex-[0.4] min-w-[32px]">
        <div className="flex items-center min-h-[26px]">
          <input
            type="checkbox"
            checked={form.productArrived}
            onChange={(e) => onChange('productArrived', e.target.checked)}
            className={checkboxClass}
          />
        </div>
      </InlineField>

      <InlineField label="세금계산서" className="flex-[0.55] min-w-[36px]">
        <div className="flex items-center min-h-[26px]">
          <input
            type="checkbox"
            checked={form.taxInvoiceIssued}
            onChange={(e) => onChange('taxInvoiceIssued', e.target.checked)}
            className={checkboxClass}
            title="세금계산서 발행 여부"
          />
        </div>
      </InlineField>

      <ShopOrderStatementModal
        isOpen={isStatementModalOpen}
        html={statementHtml}
        onClose={() => setIsStatementModalOpen(false)}
      />

      {previewImageUrl && (
        <GalleryImageModal imageUrl={previewImageUrl} onClose={() => setPreviewImageUrl(null)} />
      )}
    </>
  );
}
