import { useState, useRef, useEffect } from 'react';
import { addProductImage, setMainImage, uploadProductImages, deleteProductImage } from '../../../api/productCollabApi';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { ProductCollabProductImage, ProductCollabStatus } from '../types';
import { PRODUCT_COLLAB_STATUS_LABEL_KEYS } from '../types';
import { getProductCollabImageUrl } from '../utils/imageUrl';
import { ImageModal } from '../shared/ImageModal';
import { ImagePlus, MoreVertical, Star, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';

type ModalImageState = { url: string; type: 'main' | 'thumbnail' | 'preview'; imageId?: number };

interface MainImageSectionProps {
  productId: number;
  mainImageId?: number;
  mainImageUrl: string | null;
  productImages: ProductCollabProductImage[];
  onUpdate: () => void;
  /** 진행 상태 드롭다운을 대표이미지 영역에 함께 표시 */
  status?: ProductCollabStatus | null;
  onStatusChange?: (status: ProductCollabStatus) => void;
  updatingStatus?: boolean;
}

export function MainImageSection({
  productId,
  mainImageId,
  mainImageUrl,
  productImages,
  onUpdate,
  status,
  onStatusChange,
  updatingStatus = false,
}: MainImageSectionProps) {
  const PROGRESS_STATUSES: ProductCollabStatus[] = ['RESEARCH', 'SAMPLE_TEST', 'CONFIG_CONFIRM', 'ORDER_PENDING', 'INCOMING', 'IN_PRODUCTION', 'PRODUCTION_COMPLETE', 'CANCELLED'];
  const { t } = useLanguage();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [settingMain, setSettingMain] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [modalState, setModalState] = useState<ModalImageState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const addByUpload = async (asMain: boolean) => {
    if (!selectedFile) {
      setError(t('productCollab.selectImage'));
      return;
    }
    setError(null);
    setAdding(true);
    try {
      const uploadRes = await uploadProductImages(productId, [selectedFile]);
      if (!uploadRes.success) {
        throw new Error(uploadRes.error ?? t('productCollab.uploadFailed'));
      }
      const url = uploadRes.data?.urls?.[0];
      if (!url) {
        throw new Error(t('productCollab.noUploadedUrl'));
      }
      const res = await addProductImage(productId, { image_url: url, set_as_main: asMain });
      if (!res.success) throw new Error(res.error);
      setSelectedFile(null);
      setPreviewUrl(null);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('productCollab.uploadFailed'));
    } finally {
      setAdding(false);
    }
  };

  const handleSetMain = async (imageId: number) => {
    setSettingMain(imageId);
    setError(null);
    try {
      const res = await setMainImage(productId, imageId);
      if (!res.success) throw new Error(res.error);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('productCollab.setFailed'));
    } finally {
      setSettingMain(null);
    }
  };

  const handleDeleteImage = async (imageId: number, onSuccess?: () => void) => {
    if (!window.confirm(t('productCollab.deleteImageConfirm'))) return;
    setDeletingId(imageId);
    setError(null);
    try {
      const res = await deleteProductImage(productId, imageId);
      if (!res.success) throw new Error(res.error);
      onUpdate();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('productCollab.deleteFailed'));
    } finally {
      setDeletingId(null);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
    e.target.value = '';
  };

  return (
    <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-medium text-[#1F2937]">{t('productCollab.repImage')}</h3>
        {onStatusChange != null && status != null && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-[#6B7280]">{t('productCollab.setProgressStatus')}:</label>
            <select
              value={status ?? 'RESEARCH'}
              onChange={(e) => {
                const newStatus = e.target.value as ProductCollabStatus;
                if (newStatus !== (status ?? 'RESEARCH')) onStatusChange(newStatus);
              }}
              disabled={updatingStatus}
              className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#1F2937] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB] disabled:opacity-50 min-w-[160px]"
            >
              {PROGRESS_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(PRODUCT_COLLAB_STATUS_LABEL_KEYS[s])}
                </option>
              ))}
            </select>
            {updatingStatus && <span className="text-xs text-[#6B7280]">{t('productCollab.saving')}</span>}
          </div>
        )}
      </div>
      {mainImageUrl && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setModalState({ url: getProductCollabImageUrl(mainImageUrl), type: 'main', imageId: mainImageId })}
            className="block text-left rounded border border-[#E5E7EB] overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          >
            <img
              src={getProductCollabImageUrl(mainImageUrl)}
              alt={t('productCollab.repImageAlt')}
              className="max-h-48 w-full object-contain cursor-pointer"
            />
          </button>
        </div>
      )}
      <ImageModal
        imageUrl={modalState?.url ?? null}
        onClose={() => setModalState(null)}
        actions={
          modalState && (modalState.type === 'main' || modalState.type === 'thumbnail') && modalState.imageId != null
            ? (() => {
                const img = productImages.find((i) => i.id === modalState.imageId!);
                return (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white data-[state=open]:bg-white/20"
                      aria-label={t('productCollab.imageAction')}
                    >
                      <button type="button">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="bottom" className="min-w-[10rem]">
                      <DropdownMenuItem
                        disabled={settingMain === modalState.imageId || img?.kind === 'final'}
                        onClick={async () => {
                          await handleSetMain(modalState.imageId!);
                          setModalState(null);
                        }}
                      >
                        <Star className="w-4 h-4" />
                        {img?.kind === 'final' ? t('productCollab.repImageAlt') : t('productCollab.setAsRep')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={deletingId === modalState.imageId}
                        onClick={() => handleDeleteImage(modalState.imageId!, () => setModalState(null))}
                      >
                        <Trash2 className="w-4 h-4" />
                        {t('productCollab.deleteImage')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              })()
            : undefined
        }
      />

      {/* 이미지 업로드 */}
      <div className="mb-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={onFileChange}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#2563EB] hover:bg-[#EFF6FF] rounded-lg border border-[#E5E7EB]"
          >
            <ImagePlus className="w-4 h-4" />
            {t('productCollab.uploadImage')}
          </button>
          {selectedFile && (
            <>
              <div className="flex items-center gap-3">
                {previewUrl && (
                  <button
                    type="button"
                    onClick={() => setModalState({ url: previewUrl, type: 'preview' })}
                    className="w-20 h-20 rounded-lg border border-[#E5E7EB] overflow-hidden bg-[#F8F9FB] flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  >
                    <img src={previewUrl} alt="" className="w-full h-full object-contain cursor-pointer" />
                  </button>
                )}
                <span className="text-sm text-[#6B7280] max-w-[180px] truncate" title={selectedFile.name}>
                  {selectedFile.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                type="button"
                disabled={adding}
                onClick={() => addByUpload(false)}
                className="px-3 py-2 text-sm text-[#1F2937] bg-[#E5E7EB] rounded-lg hover:bg-[#D1D5DB] disabled:opacity-50"
              >
                {t('productCollab.addAsCandidate')}
              </button>
              <button
                type="button"
                disabled={adding}
                onClick={() => addByUpload(true)}
                className="px-3 py-2 text-sm text-white bg-[#2563EB] rounded-lg hover:bg-[#1D4ED8] disabled:opacity-50"
              >
                {t('productCollab.setAsMain')}
              </button>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="px-2 py-1 text-xs text-[#6B7280] hover:text-[#1F2937]"
              >
                {t('common.cancel')}
              </button>
              </div>
            </>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      {productImages.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {productImages.map((img) => (
            <div key={img.id} className="relative group">
              <button
                type="button"
                onClick={() => setModalState({ url: getProductCollabImageUrl(img.image_url), type: 'thumbnail', imageId: img.id })}
                className="block w-20 h-20 rounded border border-[#E5E7EB] overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                <img
                  src={getProductCollabImageUrl(img.image_url)}
                  alt=""
                  className="h-full w-full object-cover cursor-pointer"
                />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  asChild
                  className="absolute top-0.5 right-0.5 p-1.5 rounded bg-black/50 text-white hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1 data-[state=open]:bg-black/70"
                  aria-label={t('productCollab.imageAction')}
                >
                  <button type="button">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="bottom" className="min-w-[10rem]">
                  <DropdownMenuItem
                    disabled={settingMain === img.id || img.kind === 'final'}
                    onClick={() => handleSetMain(img.id)}
                  >
                    <Star className="w-4 h-4" />
                    {img.kind === 'final' ? t('productCollab.repImageAlt') : t('productCollab.setAsRep')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={deletingId === img.id}
                    onClick={() => handleDeleteImage(img.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('productCollab.deleteImage')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
