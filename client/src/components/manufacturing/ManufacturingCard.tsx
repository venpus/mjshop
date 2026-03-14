import { Package } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getFullManufacturingImageUrl } from '../../api/manufacturingApi';
import type { ManufacturingDocument } from '../../types/manufacturing';

interface ManufacturingCardProps {
  doc: ManufacturingDocument;
  getFullImageUrl: (url: string | null | undefined) => string;
  onClick: () => void;
}

export function ManufacturingCard({ doc, getFullImageUrl, onClick }: ManufacturingCardProps) {
  const { t } = useLanguage();
  const imageUrl = doc.product_image ? getFullImageUrl(doc.product_image) : '';

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow p-4"
    >
      <div className="flex gap-3">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
          {imageUrl ? (
            <img src={imageUrl} alt={doc.product_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-gray-900 truncate">{doc.product_name || t('manufacturing.noProductName')}</div>
          {doc.product_name_zh && (
            <div className="text-sm text-gray-600 truncate">{doc.product_name_zh}</div>
          )}
          <div className="text-sm text-gray-500 mt-0.5">
            {t('manufacturing.quantity')}: {doc.quantity}
            {doc.packing_list_code && (
              <span className="ml-2">· {t('manufacturing.packingListCode')}: {doc.packing_list_code}</span>
            )}
          </div>
          {(doc.small_pack_count != null || doc.quantity_per_box != null) && (
            <div className="text-xs text-gray-400 mt-0.5">
              {doc.small_pack_count != null && `${t('manufacturing.smallPackCount')}: ${doc.small_pack_count}`}
              {doc.small_pack_count != null && doc.quantity_per_box != null && ' / '}
              {doc.quantity_per_box != null && `${t('manufacturing.quantityPerBox')}: ${doc.quantity_per_box}`}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
