import { useEffect, useRef, useState } from 'react';
import { Copy, Image, Loader2, Megaphone } from 'lucide-react';
import { ProductActions } from './ProductActions';
import { ProductAdCopyModal } from './ProductAdCopyModal';
import { ProductImagesGalleryModal } from './ProductImagesGalleryModal';
import {
  formatProductInfoClipboardText,
  getProductInfoDisplayValue,
  PRODUCT_INFO_LABELS,
  type ProductInfoFields,
} from '../../utils/productInfoFormat';
import { copyTextToClipboard } from '../../utils/copyToClipboard';
import {
  getProductKindBadgeClass,
  getProductKindCardBorderClass,
  setProductKind,
  type ProductKind,
} from '../../utils/productApiHelpers';

export interface ProductCardProduct extends ProductInfoFields {
  id: string;
  productKind?: ProductKind;
  mainImage: string;
  images: string[];
  adCopy?: string | null;
}

export interface ProductCardProps {
  product: ProductCardProduct;
  onOrder?: (product: ProductCardProduct) => void;
  onEdit: (product: ProductCardProduct) => void;
  onDelete: (product: ProductCardProduct) => void;
  onAdCopySaved?: (productId: string, adCopy: string) => void;
  onMainImageChanged?: (productId: string, mainImage: string) => void;
  onProductKindChanged?: (productId: string, productKind: ProductKind) => void;
  showSaleCompletedCheckbox?: boolean;
  showActions?: boolean;
  enableImageGallery?: boolean;
}

export function ProductCard({
  product,
  onOrder,
  onEdit,
  onDelete,
  onAdCopySaved,
  onMainImageChanged,
  onProductKindChanged,
  showSaleCompletedCheckbox = false,
  showActions = true,
  enableImageGallery = true,
}: ProductCardProps) {
  const [copied, setCopied] = useState(false);
  const [isAdCopyModalOpen, setIsAdCopyModalOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [displayMainImage, setDisplayMainImage] = useState(product.mainImage);
  const [savedAdCopy, setSavedAdCopy] = useState<string | null>(product.adCopy ?? null);
  const [displayKind, setDisplayKind] = useState<ProductKind>(product.productKind ?? '판매가능');
  const [isKindSaving, setIsKindSaving] = useState(false);
  const kindBeforeSaleRef = useRef<ProductKind>('판매가능');

  useEffect(() => {
    setSavedAdCopy(product.adCopy ?? null);
  }, [product.adCopy, product.id]);

  useEffect(() => {
    setDisplayMainImage(product.mainImage);
  }, [product.mainImage, product.id]);

  useEffect(() => {
    setDisplayKind(product.productKind ?? '판매가능');
    if (product.productKind && product.productKind !== '판매완료') {
      kindBeforeSaleRef.current = product.productKind;
    }
  }, [product.productKind, product.id]);

  const isSaleCompleted = displayKind === '판매완료';

  const cardBorderClass = getProductKindCardBorderClass(displayKind);

  const handleActionsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (enableImageGallery) {
      setIsGalleryOpen(true);
    }
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await copyTextToClipboard(formatProductInfoClipboardText(product));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('복사에 실패했습니다.');
    }
  };

  const handleSaleCompletedChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const checked = e.target.checked;
    const nextKind: ProductKind = checked
      ? (() => {
          if (displayKind !== '판매완료') {
            kindBeforeSaleRef.current = displayKind;
          }
          return '판매완료';
        })()
      : kindBeforeSaleRef.current;
    setIsKindSaving(true);
    try {
      await setProductKind(product.id, nextKind);
      setDisplayKind(nextKind);
      onProductKindChanged?.(product.id, nextKind);
    } catch {
      alert('판매완료 상태 변경에 실패했습니다.');
    } finally {
      setIsKindSaving(false);
    }
  };

  return (
    <article
      className={`group flex flex-col bg-white rounded-lg border-2 overflow-hidden transition-all w-full ${cardBorderClass}`}
    >
      <div
        className={`relative aspect-square bg-gray-50 flex items-center justify-center overflow-hidden ${
          enableImageGallery ? 'cursor-pointer hover:bg-gray-100' : ''
        }`}
        onClick={handleImageClick}
        title={enableImageGallery ? '사진 보기 · 메인 이미지 선택' : undefined}
      >
        {displayMainImage ? (
          <img
            src={displayMainImage}
            alt={product.id}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <Image className="w-12 h-12 text-gray-300" />
        )}
      </div>

      <div className="flex flex-col flex-1 p-2.5 gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 px-0.5">
          <p className="text-xs font-bold text-gray-900 truncate flex-1" title={product.id}>
            {product.id}
          </p>
          <span
            className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold border ${getProductKindBadgeClass(
              displayKind
            )}`}
          >
            {displayKind}
          </span>
        </div>

        {showSaleCompletedCheckbox && (
          <label
            className="flex items-center gap-2 px-1 py-1 rounded-md bg-slate-50 border border-slate-200 cursor-pointer select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={isSaleCompleted}
              disabled={isKindSaving}
              onChange={(e) => void handleSaleCompletedChange(e)}
              className="w-3.5 h-3.5 rounded border-slate-300 text-slate-700 focus:ring-slate-500 disabled:opacity-50"
            />
            <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
              {isKindSaving && <Loader2 className="w-3 h-3 animate-spin" />}
              판매완료
            </span>
          </label>
        )}

        <dl className="grid grid-cols-2 gap-1.5">
          {PRODUCT_INFO_LABELS.map(({ key, label }) => {
            const isHighlight =
              key === 'finalCny' || key === 'finalKrw' || key === 'deliveryDate';
            return (
              <div
                key={key}
                className={`min-w-0 rounded px-1.5 py-1 border ${
                  key === 'deliveryDate'
                    ? 'bg-sky-50 border-sky-200 col-span-2'
                    : isHighlight
                      ? 'bg-purple-50 border-purple-100'
                      : 'bg-gray-50 border-gray-100'
                }`}
              >
                <dt className="text-[10px] font-semibold text-gray-500 leading-none mb-0.5">
                  {label}
                </dt>
                <dd
                  className={`text-[11px] font-bold leading-tight truncate ${
                    key === 'deliveryDate'
                      ? 'text-sky-800'
                      : key === 'finalCny' || key === 'finalKrw'
                        ? 'text-purple-800'
                        : 'text-gray-900'
                  }`}
                  title={getProductInfoDisplayValue(product, key)}
                >
                  {getProductInfoDisplayValue(product, key)}
                </dd>
              </div>
            );
          })}
        </dl>

        <div className="pt-2 mt-auto border-t border-gray-100 space-y-1.5" onClick={handleActionsClick}>
          <button
            type="button"
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-bold text-purple-800 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? '복사됨' : '복사하기'}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsAdCopyModalOpen(true);
            }}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-bold text-orange-800 bg-orange-50 hover:bg-orange-100 rounded-md transition-colors"
          >
            <Megaphone className="w-3.5 h-3.5" />
            {savedAdCopy ? '광고문구 수정' : '광고문구 저장'}
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

      {isGalleryOpen && (
        <ProductImagesGalleryModal
          productId={product.id}
          mainImage={displayMainImage}
          images={product.images}
          onClose={() => setIsGalleryOpen(false)}
          onMainImageChanged={(mainImage) => {
            setDisplayMainImage(mainImage);
            onMainImageChanged?.(product.id, mainImage);
          }}
        />
      )}

      {isAdCopyModalOpen && (
        <ProductAdCopyModal
          productId={product.id}
          initialAdCopy={savedAdCopy}
          onClose={() => setIsAdCopyModalOpen(false)}
          onSaved={(adCopy) => {
            setSavedAdCopy(adCopy);
            onAdCopySaved?.(product.id, adCopy);
          }}
        />
      )}
    </article>
  );
}
