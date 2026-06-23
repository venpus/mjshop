import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Star, X } from 'lucide-react';
import { setProductMainImage, getFullImageUrl } from '../../utils/productApiHelpers';

interface ProductImagesGalleryModalProps {
  productId: string;
  mainImage: string;
  images: string[];
  onClose: () => void;
  onMainImageChanged?: (mainImageUrl: string) => void;
}

function normalizePath(url: string): string {
  return url.split('?')[0];
}

function isSameImage(a: string, b: string): boolean {
  const na = normalizePath(a);
  const nb = normalizePath(b);
  return na === nb || na.endsWith(nb) || nb.endsWith(na);
}

export function ProductImagesGalleryModal({
  productId,
  mainImage,
  images,
  onClose,
  onMainImageChanged,
}: ProductImagesGalleryModalProps) {
  const [currentMain, setCurrentMain] = useState(mainImage);
  const [isSaving, setIsSaving] = useState(false);
  const [savingUrl, setSavingUrl] = useState<string | null>(null);

  const allImages = useMemo(() => {
    const urls: string[] = [];
    const add = (url: string) => {
      const full = getFullImageUrl(url);
      if (full && !urls.some((existing) => isSameImage(existing, full))) {
        urls.push(full);
      }
    };
    if (mainImage) add(mainImage);
    for (const img of images) add(img);
    return urls;
  }, [mainImage, images]);

  useEffect(() => {
    setCurrentMain(mainImage);
  }, [mainImage]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, isSaving]);

  const handleSetMain = async (imageUrl: string) => {
    if (isSameImage(imageUrl, currentMain)) return;

    setIsSaving(true);
    setSavingUrl(imageUrl);
    try {
      await setProductMainImage(productId, imageUrl);
      setCurrentMain(imageUrl);
      onMainImageChanged?.(imageUrl);
    } catch (err) {
      alert(err instanceof Error ? err.message : '메인 이미지 변경에 실패했습니다.');
    } finally {
      setIsSaving(false);
      setSavingUrl(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-200 shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-900 truncate">상품 사진 · {productId}</h3>
            <p className="text-xs text-gray-500 mt-0.5">메인으로 사용할 사진을 선택하세요</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 shrink-0"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 min-h-0">
          {allImages.length === 0 ? (
            <p className="py-16 text-center text-gray-500">등록된 사진이 없습니다.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {allImages.map((imageUrl, index) => {
                const isMain = isSameImage(imageUrl, currentMain);
                const isItemSaving = savingUrl === imageUrl;

                return (
                  <div
                    key={`${imageUrl}-${index}`}
                    className={`relative flex flex-col rounded-lg border-2 overflow-hidden bg-gray-50 ${
                      isMain ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-200'
                    }`}
                  >
                    <div className="aspect-square flex items-center justify-center p-2">
                      <img
                        src={imageUrl}
                        alt={`${productId} ${index + 1}`}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>

                    {isMain && (
                      <div className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold">
                        <Star className="w-3 h-3 fill-current" />
                        메인
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={isMain || isSaving}
                      onClick={() => void handleSetMain(imageUrl)}
                      className={`flex items-center justify-center gap-1 px-2 py-2 text-xs font-semibold border-t transition-colors ${
                        isMain
                          ? 'bg-orange-50 text-orange-700 border-orange-200 cursor-default'
                          : 'bg-white text-gray-700 hover:bg-purple-50 hover:text-purple-700 border-gray-200 disabled:opacity-50'
                      }`}
                    >
                      {isItemSaving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isMain ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : null}
                      {isMain ? '메인 이미지' : '메인으로 지정'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
