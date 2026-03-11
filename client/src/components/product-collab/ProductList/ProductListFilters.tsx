import type { ProductCollabStatus, ProductCollabCategory } from '../types';
import { useLanguage } from '../../../contexts/LanguageContext';

const STATUS_OPTIONS: { value: string; labelKey: string }[] = [
  { value: '', labelKey: 'productCollab.statusAll' },
  { value: 'RESEARCH', labelKey: 'productCollab.statusResearch' },
  { value: 'SAMPLE_TEST', labelKey: 'productCollab.statusSampleTest' },
  { value: 'CONFIG_CONFIRM', labelKey: 'productCollab.statusConfigConfirm' },
  { value: 'ORDER_PENDING', labelKey: 'productCollab.statusOrderPending' },
  { value: 'INCOMING', labelKey: 'productCollab.statusIncoming' },
  { value: 'IN_PRODUCTION', labelKey: 'productCollab.statusInProduction' },
  { value: 'PRODUCTION_COMPLETE', labelKey: 'productCollab.statusProductionComplete' },
];

const CATEGORY_OPTIONS: { value: '' | ProductCollabCategory; labelKey: string }[] = [
  { value: '', labelKey: 'productCollab.categoryAll' },
  { value: 'Plush', labelKey: 'productCollab.categoryPlush' },
  { value: 'Goods', labelKey: 'productCollab.categoryGoods' },
  { value: 'Figure', labelKey: 'productCollab.categoryFigure' },
];

export interface ProductListFiltersValue {
  search: string;
  status: string;
  category: string;
}

interface ProductListFiltersProps {
  value: ProductListFiltersValue;
  onChange: (v: ProductListFiltersValue) => void;
  onApply: () => void;
}

export function ProductListFilters({ value, onChange, onApply }: ProductListFiltersProps) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-wrap items-end gap-3 p-4 bg-white rounded-lg border border-[#E5E7EB]">
      <div className="min-w-[180px]">
        <label className="block text-xs font-medium text-[#6B7280] mb-1">{t('common.search')}</label>
        <input
          type="text"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && onApply()}
          placeholder={t('productCollab.filterSearchPlaceholder')}
          className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">{t('productCollab.filterStatus')}</label>
        <select
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value })}
          className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>
              {t(o.labelKey)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">{t('productCollab.filterCategory')}</label>
        <select
          value={value.category}
          onChange={(e) => onChange({ ...value, category: e.target.value })}
          className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm"
        >
          {CATEGORY_OPTIONS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>
              {t(o.labelKey)}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={onApply}
        className="px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-[#1D4ED8]"
      >
        {t('common.apply')}
      </button>
    </div>
  );
}
