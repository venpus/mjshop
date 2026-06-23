import {
  PRODUCT_KIND_FILTER_OPTIONS,
  type ProductKindFilter,
} from '../../utils/productApiHelpers';

interface ProductKindFilterBarProps {
  value: ProductKindFilter;
  onChange: (value: ProductKindFilter) => void;
  counts?: Partial<Record<ProductKindFilter, number>>;
}

export function ProductKindFilterBar({
  value,
  onChange,
  counts,
}: ProductKindFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRODUCT_KIND_FILTER_OPTIONS.map((option) => {
        const selected = value === option.value;
        const count = counts?.[option.value];
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
              selected
                ? option.value === '판매완료'
                  ? 'bg-slate-700 text-white border-slate-700'
                  : option.value === '재고조사'
                    ? 'bg-amber-500 text-white border-amber-500'
                    : option.value === '판매가능'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-orange-500 text-white border-orange-500'
                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <span>{option.label}</span>
            {count !== undefined && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  selected ? 'bg-white/20' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
