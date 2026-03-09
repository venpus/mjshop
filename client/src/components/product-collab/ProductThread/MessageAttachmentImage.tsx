import { useState } from 'react';
import { addProductImage } from '../../../api/productCollabApi';
import { getProductCollabImageUrl } from '../utils/imageUrl';
import { useLanguage } from '../../../contexts/LanguageContext';
import { ImageModal } from '../shared/ImageModal';
import { MoreVertical, ImagePlus, Star, ExternalLink } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';

export interface MessageAttachmentImageProps {
  imageUrl: string;
  productId: number;
  onAdded: () => void;
}

export function MessageAttachmentImage({
  imageUrl,
  productId,
  onAdded,
}: MessageAttachmentImageProps) {
  const { t } = useLanguage();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fullUrl = getProductCollabImageUrl(imageUrl);

  const addAsCandidate = async () => {
    setError(null);
    setAdding(true);
    try {
      const res = await addProductImage(productId, { image_url: imageUrl, set_as_main: false });
      if (!res.success) throw new Error(res.error);
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('productCollab.addFailed'));
    } finally {
      setAdding(false);
    }
  };

  const addAsMain = async () => {
    if (!window.confirm(t('productCollab.setRepConfirm'))) return;
    setError(null);
    setAdding(true);
    try {
      const res = await addProductImage(productId, { image_url: imageUrl, set_as_main: true });
      if (!res.success) throw new Error(res.error);
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('productCollab.setFailed'));
    } finally {
      setAdding(false);
    }
  };

  const openInNewTab = () => {
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="inline-block">
      <div className="relative group rounded border border-[#E5E7EB] overflow-hidden">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-inset rounded"
          aria-label={t('productCollab.imageViewNewTab')}
        >
          <img
            src={fullUrl}
            alt=""
            className="max-h-24 w-auto rounded object-contain cursor-pointer"
          />
        </button>
        <ImageModal
          imageUrl={modalOpen ? fullUrl : null}
          onClose={() => setModalOpen(false)}
          actions={
            modalOpen ? (
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
                  <DropdownMenuItem disabled={adding} onClick={addAsCandidate}>
                    <ImagePlus className="w-4 h-4" />
                    {t('productCollab.addAsCandidate')}
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={adding} onClick={addAsMain}>
                    <Star className="w-4 h-4" />
                    {t('productCollab.setAsMain')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={openInNewTab}>
                    <ExternalLink className="w-4 h-4" />
                    {t('productCollab.openInNewTab')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : undefined
          }
        />
        <DropdownMenu>
          <DropdownMenuTrigger
            asChild
            className="absolute top-1 right-1 p-1.5 rounded bg-black/50 text-white hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1 data-[state=open]:bg-black/70"
            aria-label={t('productCollab.imageAction')}
          >
            <button type="button">
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom" className="min-w-[10rem]">
            <DropdownMenuItem disabled={adding} onClick={addAsCandidate}>
              <ImagePlus className="w-4 h-4" />
              {t('productCollab.addAsCandidate')}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={adding} onClick={addAsMain}>
              <Star className="w-4 h-4" />
              {t('productCollab.setAsMain')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={openInNewTab}>
              <ExternalLink className="w-4 h-4" />
              {t('productCollab.openInNewTab')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
