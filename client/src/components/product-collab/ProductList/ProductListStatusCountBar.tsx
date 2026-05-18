import { useEffect, useState } from 'react';
import { getProductStatusCounts } from '../../../api/productCollabApi';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { DashboardStatusCount, ProductCollabStatus } from '../types';
import {
  PRODUCT_COLLAB_STATUS_BADGE_CLASS,
  PRODUCT_COLLAB_STATUS_LABEL_KEYS,
} from '../types';
import { sortStatusCountsWithItems } from './sortStatusCounts';

interface ProductListStatusCountBarProps {
  selectedStatus: string;
  onSelectStatus: (status: ProductCollabStatus) => void;
  refreshKey?: number;
}

export function ProductListStatusCountBar({
  selectedStatus,
  onSelectStatus,
  refreshKey = 0,
}: ProductListStatusCountBarProps) {
  const { t } = useLanguage();
  const [items, setItems] = useState<DashboardStatusCount[]>([]);

  useEffect(() => {
    let cancelled = false;
    getProductStatusCounts().then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setItems(sortStatusCountsWithItems(res.data));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (items.length === 0) return null;

  return (
    <div
      className="mb-3 flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin"
      role="toolbar"
      aria-label={t('productCollab.productStatusSection')}
    >
      {items.map((s) => {
        const status = s.status as ProductCollabStatus;
        const badgeClass =
          PRODUCT_COLLAB_STATUS_BADGE_CLASS[status] ?? 'bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]';
        const isSelected = selectedStatus === s.status;
        return (
          <button
            key={s.status}
            type="button"
            onClick={() => onSelectStatus(status)}
            className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border transition-opacity hover:opacity-90 ${badgeClass} ${
              isSelected ? 'ring-2 ring-[#2563EB] ring-offset-1' : ''
            }`}
          >
            <span className="whitespace-nowrap">{t(PRODUCT_COLLAB_STATUS_LABEL_KEYS[status] ?? s.status)}</span>
            <span className="tabular-nums font-semibold">{s.count}</span>
          </button>
        );
      })}
    </div>
  );
}
