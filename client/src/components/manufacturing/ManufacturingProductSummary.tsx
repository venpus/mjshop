import { Package } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface ManufacturingProductSummaryProps {
  productName: string;
  productNameZh?: string | null;
  productImage?: string | null;
  quantity: number;
  getFullImageUrl: (url: string | null | undefined) => string;
}

export function ManufacturingProductSummary({
  productName,
  productNameZh,
  productImage,
  quantity,
  getFullImageUrl,
}: ManufacturingProductSummaryProps) {
  const { t } = useLanguage();
  const imageUrl = productImage ? getFullImageUrl(productImage) : '';
  const displayName = (productName || productNameZh || '').trim() || t('manufacturing.noProductName');

  return (
    <div className="flex flex-wrap items-center gap-3 md:gap-4 p-3 md:p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden bg-white border border-gray-200 flex-shrink-0">
        {imageUrl ? (
          <img src={imageUrl} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-gray-400" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-gray-900 truncate">{displayName}</div>
        <div className="text-sm text-gray-500 mt-0.5">
          {t('manufacturing.quantity')}: <span className="font-medium text-gray-700">{quantity}</span>
        </div>
      </div>
    </div>
  );
}
