import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { AdminCostConfirmedRow } from '../../utils/adminCostStatistics';

export interface AdminCostConfirmedModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrders: AdminCostConfirmedRow[];
  packingLists: AdminCostConfirmedRow[];
}

function ConfirmedSection({
  title,
  rows,
  emptyLabel,
  formatCurrency,
  nameHeader,
  amountHeader,
}: {
  title: string;
  rows: AdminCostConfirmedRow[];
  emptyLabel: string;
  formatCurrency: (n: number) => string;
  nameHeader: string;
  amountHeader: string;
}) {
  const subtotal = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <section className="mb-6 last:mb-0">
      <h3 className="text-base font-bold text-gray-900 mb-2 px-1 border-l-4 border-amber-600 pl-2">
        {title}
        <span className="ml-2 text-sm font-semibold text-amber-800 tabular-nums">
          ({formatCurrency(subtotal)})
        </span>
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 px-2 bg-gray-50 rounded-lg">{emptyLabel}</p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[min(40vh,320px)] overflow-y-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-700">{nameHeader}</th>
                <th className="text-right py-2.5 px-3 font-semibold text-gray-700 w-36">{amountHeader}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-amber-50/50">
                  <td className="py-2.5 px-3 text-gray-900 break-words max-w-[70vw] sm:max-w-md">
                    {row.name}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-amber-900 tabular-nums whitespace-nowrap">
                    {formatCurrency(row.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function AdminCostConfirmedModal({
  isOpen,
  onClose,
  purchaseOrders,
  packingLists,
}: AdminCostConfirmedModalProps) {
  const { t } = useLanguage();
  const formatCurrency = (n: number) => `¥${n.toLocaleString('ko-KR')}`;

  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const grand =
    purchaseOrders.reduce((s, r) => s + r.amount, 0) + packingLists.reduce((s, r) => s + r.amount, 0);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-cost-confirmed-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-amber-50/80 flex-shrink-0">
          <h2 id="admin-cost-confirmed-modal-title" className="text-lg font-bold text-gray-900 pr-2">
            {t('payment.adminCostConfirmedModalTitle')}
            <span className="block sm:inline sm:ml-2 text-base font-semibold text-amber-800 tabular-nums mt-1 sm:mt-0">
              {formatCurrency(grand)}
            </span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-600 hover:bg-amber-100 hover:text-gray-900 transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">
          <ConfirmedSection
            title={t('payment.adminCostConfirmedSectionPO')}
            rows={purchaseOrders}
            emptyLabel={t('payment.adminCostConfirmedEmptyPO')}
            formatCurrency={formatCurrency}
            nameHeader={t('payment.adminCostConfirmedColName')}
            amountHeader={t('payment.adminCostConfirmedColAmount')}
          />
          <ConfirmedSection
            title={t('payment.adminCostConfirmedSectionPL')}
            rows={packingLists}
            emptyLabel={t('payment.adminCostConfirmedEmptyPL')}
            formatCurrency={formatCurrency}
            nameHeader={t('payment.adminCostConfirmedColName')}
            amountHeader={t('payment.adminCostConfirmedColAmount')}
          />
        </div>
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-900"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
