import { useState } from 'react';
import { Copy, Image } from 'lucide-react';
import { ProductActions } from './ProductActions';
import {
  formatProductInfoClipboardText,
  getProductInfoDisplayValue,
  PRODUCT_INFO_LABELS,
  type ProductInfoFields,
} from '../../utils/productInfoFormat';

export interface ProductCardProduct extends ProductInfoFields {
  id: string;
  mainImage: string;
}

export interface ProductCardProps {
  product: ProductCardProduct;
  onViewDetail: (product: ProductCardProduct) => void;
  onOrder?: (product: ProductCardProduct) => void;
  onEdit: (product: ProductCardProduct) => void;
  onDelete: (product: ProductCardProduct) => void;
  showActions?: boolean;
}

export function ProductCard({
  product,
  onViewDetail,
  onOrder,
  onEdit,
  onDelete,
  showActions = true,
}: ProductCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCardClick = () => {
    onViewDetail(product);
  };

  const handleActionsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(formatProductInfoClipboardText(product));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('복사에 실패했습니다.');
    }
  };

  return (
    <article
      className="group flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-purple-200 hover:shadow-md transition-all cursor-pointer w-full"
      onClick={handleCardClick}
    >
      <div className="relative aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
        {product.mainImage ? (
          <img
            src={product.mainImage}
            alt={product.id}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <Image className="w-12 h-12 text-gray-300" />
        )}
      </div>

      <div className="flex flex-col flex-1 p-3 gap-2 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate" title={product.id}>
          {product.id}
        </p>

        <dl className="space-y-1 text-xs">
          {PRODUCT_INFO_LABELS.map(({ key, label }) => (
            <div key={key} className="flex gap-1.5 min-w-0">
              <dt className="text-gray-500 shrink-0 w-[72px]">{label}</dt>
              <dd
                className={`font-medium truncate ${
                  key === 'finalCny' || key === 'finalKrw'
                    ? 'text-purple-700'
                    : 'text-gray-800'
                }`}
              >
                {getProductInfoDisplayValue(product, key)}
              </dd>
            </div>
          ))}
        </dl>

        <div className="pt-2 mt-auto border-t border-gray-100 space-y-2" onClick={handleActionsClick}>
          <button
            type="button"
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? '복사됨' : '복사하기'}
          </button>

          {showActions && (
            <div className="flex items-center justify-end [&_button]:p-1.5 [&_svg]:w-4 [&_svg]:h-4">
              <ProductActions
                product={product}
                onOrder={onOrder}
                onEdit={onEdit}
                onDelete={onDelete}
                className="gap-1"
              />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
