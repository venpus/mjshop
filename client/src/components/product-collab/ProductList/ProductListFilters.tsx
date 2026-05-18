import type { ProductCollabCategory } from '../types';
import { useLanguage } from '../../../contexts/LanguageContext';
import { SubmitSearchField } from '../../ui/submit-search-field';

const STATUS_OPTIONS: { value: string; labelKey: string }[] = [
  { value: '', labelKey: 'productCollab.statusAll' },
  { value: 'RESEARCH', labelKey: 'productCollab.statusResearch' },
  { value: 'SAMPLE_TEST', labelKey: 'productCollab.statusSampleTest' },
  { value: 'CONFIG_CONFIRM', labelKey: 'productCollab.statusConfigConfirm' },
  { value: 'ORDER_PENDING', labelKey: 'productCollab.statusOrderPending' },
  { value: 'INCOMING', labelKey: 'productCollab.statusIncoming' },
  { value: 'IN_PRODUCTION', labelKey: 'productCollab.statusInProduction' },
  { value: 'PRODUCTION_COMPLETE', labelKey: 'productCollab.statusProductionComplete' },
  { value: 'ISSUE_OCCURRED', labelKey: 'productCollab.statusIssueOccurred' },
];

const CATEGORY_OPTIONS: { value: '' | ProductCollabCategory; labelKey: string }[] = [
  { value: '', labelKey: 'productCollab.categoryAll' },
  { value: 'Plush', labelKey: 'productCollab.categoryPlush' },
  { value: 'Goods', labelKey: 'productCollab.categoryGoods' },
  { value: 'Figure', labelKey: 'productCollab.categoryFigure' },
];

export interface ProductListFiltersValue {
  status: string;
  category: string;
}

interface ProductListFiltersProps {
  filterValue: ProductListFiltersValue;
  onFilterChange: (v: ProductListFiltersValue) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onApply: () => void;
}

export function ProductListFilters({
  filterValue,
  onFilterChange,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  onApply,
}: ProductListFiltersProps) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-wrap items-end gap-3 p-4 bg-white rounded-lg border border-[#E5E7EB]">
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">{t('common.search')}</label>
        <SubmitSearchField
          value={searchValue}
          onChange={onSearchChange}
          onSubmit={onSearchSubmit}
          placeholder={t('productCollab.filterSearchPlaceholder')}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">{t('productCollab.filterStatus')}</label>
        <select
          value={filterValue.status}
          onChange={(e) => onFilterChange({ ...filterValue, status: e.target.value })}
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
          value={filterValue.category}
          onChange={(e) => onFilterChange({ ...filterValue, category: e.target.value })}
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
