import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Trash2, Upload } from 'lucide-react';
import { getShopBuyerImageUrl } from '../../api/shopBuyerApi';
import { GalleryImageModal } from '../GalleryImageModal';

interface BuyerBusinessRegistrationImageUploadProps {
  imageUrl: string | null;
  disabled?: boolean;
  onChange: (options: { pendingFile: File | null; removeExisting: boolean }) => void;
}

const acceptTypes = 'image/jpeg,image/jpg,image/png,image/gif,image/webp';

export function BuyerBusinessRegistrationImageUpload({
  imageUrl,
  disabled = false,
  onChange,
}: BuyerBusinessRegistrationImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [removeExisting, setRemoveExisting] = useState(false);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

  const pendingPreviewUrl = useMemo(
    () => (pendingFile ? URL.createObjectURL(pendingFile) : null),
    [pendingFile]
  );

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    };
  }, [pendingPreviewUrl]);

  const displayUrl = useMemo(() => {
    if (pendingPreviewUrl) return pendingPreviewUrl;
    if (removeExisting || !imageUrl) return null;
    return getShopBuyerImageUrl(imageUrl);
  }, [pendingPreviewUrl, removeExisting, imageUrl]);

  const notifyChange = (nextPending: File | null, nextRemove: boolean) => {
    onChange({ pendingFile: nextPending, removeExisting: nextRemove });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setRemoveExisting(false);
    notifyChange(file, false);
    e.target.value = '';
  };

  const handleRemove = () => {
    setPendingFile(null);
    const nextRemove = Boolean(imageUrl);
    setRemoveExisting(nextRemove);
    notifyChange(null, nextRemove);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">사업자등록증 사진</label>
        <span className="text-xs text-gray-500">JPEG, PNG, GIF, WebP (최대 10MB)</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div
          className={`relative w-40 h-52 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center shrink-0 ${
            displayUrl ? 'cursor-pointer hover:opacity-90' : ''
          }`}
          onClick={displayUrl ? () => setPreviewModalUrl(displayUrl) : undefined}
          onKeyDown={
            displayUrl
              ? (e) => {
                  if (e.key === 'Enter') setPreviewModalUrl(displayUrl);
                }
              : undefined
          }
          role={displayUrl ? 'button' : undefined}
          tabIndex={displayUrl ? 0 : undefined}
        >
          {displayUrl ? (
            <img src={displayUrl} alt="사업자등록증" className="w-full h-full object-contain" />
          ) : (
            <div className="text-center text-gray-400 px-3">
              <Image className="w-10 h-10 mx-auto mb-2" />
              <p className="text-xs">등록된 사진 없음</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptTypes}
            className="hidden"
            disabled={disabled}
            onChange={handleFileSelect}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 text-sm text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {displayUrl ? '사진 변경' : '사진 업로드'}
          </button>
          {displayUrl && (
            <button
              type="button"
              disabled={disabled}
              onClick={handleRemove}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              삭제
            </button>
          )}
        </div>
      </div>

      {previewModalUrl && (
        <GalleryImageModal imageUrl={previewModalUrl} onClose={() => setPreviewModalUrl(null)} />
      )}
    </div>
  );
}
