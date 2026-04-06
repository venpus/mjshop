import React, { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { mergeAdminCostLedgerRowsForModal, type AdminCostConfirmedRow } from '../../utils/adminCostStatistics';
import { AdminCostLedgerSectionByDate } from './AdminCostLedgerSectionByDate';
import type { AdminCostLedgerVariant } from './adminCostLedgerTypes';

export type { AdminCostLedgerVariant } from './adminCostLedgerTypes';

const VARIANT_I18N = {
  confirmed: {
    titleKey: 'payment.adminCostConfirmedModalTitle',
    amountColKey: 'payment.adminCostConfirmedColAmount',
    emptyMergedKey: 'payment.adminCostConfirmedEmptyMerged',
    ariaTitleId: 'admin-cost-confirmed-modal-title',
  },
  paid: {
    titleKey: 'payment.adminCostPaidModalTitle',
    amountColKey: 'payment.adminCostPaidColAmount',
    emptyMergedKey: 'payment.adminCostPaidEmptyMerged',
    ariaTitleId: 'admin-cost-paid-modal-title',
  },
} as const;

const VARIANT_HEADER = {
  confirmed: {
    bar: 'bg-amber-50/80',
    total: 'text-amber-800',
    closeHover: 'hover:bg-amber-100',
  },
  paid: {
    bar: 'bg-green-50/80',
    total: 'text-green-800',
    closeHover: 'hover:bg-green-100',
  },
} as const;

export interface AdminCostLedgerModalProps {
  variant: AdminCostLedgerVariant;
  isOpen: boolean;
  onClose: () => void;
  purchaseOrders: AdminCostConfirmedRow[];
  packingLists: AdminCostConfirmedRow[];
}

export function AdminCostLedgerModal({
  variant,
  isOpen,
  onClose,
  purchaseOrders,
  packingLists,
}: AdminCostLedgerModalProps) {
  const { t } = useLanguage();
  const formatCurrency = (n: number) => `¥${n.toLocaleString('ko-KR')}`;
  const keys = VARIANT_I18N[variant];
  const header = VARIANT_HEADER[variant];

  const mergedRows = useMemo(
    () => mergeAdminCostLedgerRowsForModal(purchaseOrders, packingLists),
    [purchaseOrders, packingLists]
  );

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
      aria-labelledby={keys.ariaTitleId}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
        <div
          className={`flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0 ${header.bar}`}
        >
          <h2 id={keys.ariaTitleId} className="text-lg font-bold text-gray-900 pr-2">
            {t(keys.titleKey)}
            <span
              className={`block sm:inline sm:ml-2 text-base font-semibold tabular-nums mt-1 sm:mt-0 ${header.total}`}
            >
              {formatCurrency(grand)}
            </span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-lg text-gray-600 ${header.closeHover} hover:text-gray-900 transition-colors`}
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">
          <AdminCostLedgerSectionByDate
            variant={variant}
            isActive={isOpen}
            sectionKey="merged"
            mergedLayout
            rows={mergedRows}
            emptyLabel={t(keys.emptyMergedKey)}
            formatCurrency={formatCurrency}
            nameHeader={t('payment.adminCostConfirmedColName')}
            amountHeader={t(keys.amountColKey)}
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

export type AdminCostConfirmedModalProps = Omit<AdminCostLedgerModalProps, 'variant'>;

export function AdminCostConfirmedModal(props: AdminCostConfirmedModalProps) {
  return <AdminCostLedgerModal variant="confirmed" {...props} />;
}

export type AdminCostPaidModalProps = Omit<AdminCostLedgerModalProps, 'variant'>;

export function AdminCostPaidModal(props: AdminCostPaidModalProps) {
  return <AdminCostLedgerModal variant="paid" {...props} />;
}
