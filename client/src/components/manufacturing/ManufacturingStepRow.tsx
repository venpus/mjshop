import { useRef } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getFullManufacturingImageUrl } from '../../api/manufacturingApi';

interface ManufacturingStepRowProps {
  displayOrder: number;
  processName: string;
  workMethod: string;
  imageUrls: string[];
  onProcessNameChange: (value: string) => void;
  onWorkMethodChange: (value: string) => void;
  onImageUrlsChange: (urls: string[]) => void;
  onRemove: () => void;
  onUploadImages?: (files: File[]) => Promise<string[]>;
  disabled?: boolean;
}

export function ManufacturingStepRow({
  displayOrder,
  processName,
  workMethod,
  imageUrls,
  onProcessNameChange,
  onWorkMethodChange,
  onImageUrlsChange,
  onRemove,
  onUploadImages,
  disabled = false,
}: ManufacturingStepRowProps) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0 || !onUploadImages) return;
    try {
      const newUrls = await onUploadImages(files);
      onImageUrlsChange([...imageUrls, ...newUrls]);
    } catch (err: any) {
      alert(err.message || t('manufacturing.uploadFailed'));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    onImageUrlsChange(imageUrls.filter((_, i) => i !== index));
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3 md:p-4 bg-white">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-sm font-medium text-gray-500">{t('manufacturing.stepOrder')} {displayOrder}</span>
        {!disabled && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
            title={t('common.delete')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="space-y-4">
        {/* 위: 사진 영역 (크게) */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('manufacturing.exampleImages')}</label>
          <div className="flex flex-wrap gap-2 items-start">
            {imageUrls.map((url, i) => (
              <div key={i} className="relative group">
                <img
                  src={getFullManufacturingImageUrl(url)}
                  alt=""
                  className="w-40 h-40 sm:w-48 sm:h-48 object-cover rounded-lg border border-gray-200 shadow-sm"
                />
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-sm hover:bg-red-600"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {!disabled && onUploadImages && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-40 h-40 sm:w-48 sm:h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:border-purple-400 hover:text-purple-600 transition-colors bg-gray-50"
                >
                  <Plus className="w-10 h-10" />
                </button>
              </>
            )}
          </div>
        </div>
        {/* 아래: 공정명 + 공정 설명 */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('manufacturing.processNameLabel')}</label>
            <input
              type="text"
              value={processName}
              onChange={(e) => onProcessNameChange(e.target.value)}
              disabled={disabled}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              placeholder={t('manufacturing.processNamePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('manufacturing.workMethodLabel')}</label>
            <textarea
              value={workMethod}
              onChange={(e) => onWorkMethodChange(e.target.value)}
              disabled={disabled}
              rows={4}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm resize-none"
              placeholder={t('manufacturing.workMethodPlaceholder')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
