import { useState } from 'react';
import { Download, Eye, Pencil } from 'lucide-react';
import type { ShopOrder } from '../../api/shopOrderApi';
import {
  createShopOrderStatement,
  downloadShopOrderStatement,
  getShopOrderStatementPreview,
} from '../../api/shopOrderApi';
import { ShopOrderStatementCreateDialog } from './ShopOrderStatementCreateDialog';
import { ShopOrderStatementModal } from './ShopOrderStatementModal';
import { ShopLineDeliveryStatusLink } from '../shipping/ShopLineDeliveryStatusLink';
import { ShopOrderProgressFlagBadge } from './ShopOrderProgressFlagBadge';
import type { ShopOrderProgressForm } from '../../utils/shopOrderCalculations';
import type { LineShipmentInfo } from '../../utils/shopLineShipmentUtils';

interface ShopOrderFulfillmentPanelProps {
  orderId: string;
  lineId: string;
  form: ShopOrderProgressForm;
  hasStatement: boolean;
  paymentReceived: boolean;
  paymentProofImage: string | null;
  lineShipmentMap: Map<string, LineShipmentInfo>;
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
  paymentReceived,
  paymentProofImage,
  lineShipmentMap,
  onChange,
  onOrderUpdated,
  onSaveIfNeeded,
  inputClass,
}: ShopOrderFulfillmentPanelProps) {
  const [isBusy, setIsBusy] = useState(false);
  const [statementHtml, setStatementHtml] = useState('');
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [statementCreateDialogOpen, setStatementCreateDialogOpen] = useState(false);

  const hasPayment = paymentReceived || Boolean(paymentProofImage);

  const handleCreateOrUpdateStatement = () => {
    setStatementCreateDialogOpen(true);
  };

  const handleConfirmCreateStatement = async (statementDate: string) => {
    setStatementCreateDialogOpen(false);
    setIsBusy(true);
    try {
      await onSaveIfNeeded();
      const updated = await createShopOrderStatement(orderId, lineId, { statementDate });
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

  return (
    <>
      <InlineField label="배송" className="flex-[0.95] min-w-[52px]">
        <div className="flex items-center min-h-[26px]">
          <ShopLineDeliveryStatusLink lineId={lineId} lineShipmentMap={lineShipmentMap} />
        </div>
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

      <InlineField label="입금" className="flex-[0.4] min-w-[32px]">
        <div className="flex items-center min-h-[26px]">
          <ShopOrderProgressFlagBadge label="입금" display="입" checked={hasPayment} />
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

      <ShopOrderStatementCreateDialog
        isOpen={statementCreateDialogOpen}
        lineCount={1}
        isReservation={form.isReservation}
        onConfirm={(statementDate) => void handleConfirmCreateStatement(statementDate)}
        onCancel={() => setStatementCreateDialogOpen(false)}
      />

      <ShopOrderStatementModal
        isOpen={isStatementModalOpen}
        html={statementHtml}
        onClose={() => setIsStatementModalOpen(false)}
      />
    </>
  );
}
