import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { ProductCollabCategory } from '../types';

const CATEGORY_VALUES: (ProductCollabCategory | '')[] = ['', 'Plush', 'Goods', 'Figure'];

function RequestImagePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <div className="relative w-16 h-16 rounded border border-[#E5E7EB] overflow-hidden bg-[#F3F4F6]">
      {url && <img src={url} alt="" className="w-full h-full object-contain" />}
      <button type="button" onClick={onRemove} className="absolute top-0 right-0 p-0.5 bg-black/50 text-white rounded-bl text-xs">×</button>
    </div>
  );
}

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: {
    name: string;
    category: ProductCollabCategory | null;
    request_note: string | null;
    request_links: string[] | null;
    requestImageFiles: File[];
  }) => Promise<void>;
}

export function CreateProductModal({ isOpen, onClose, onCreate }: CreateProductModalProps) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCollabCategory | ''>('');
  const [requestNote, setRequestNote] = useState('');
  const [requestLinks, setRequestLinks] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState('');
  const [requestImageFiles, setRequestImageFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLink = () => {
    const url = linkInput.trim();
    if (url && !requestLinks.includes(url)) {
      setRequestLinks((prev) => [...prev, url]);
      setLinkInput('');
    }
  };

  const removeLink = (url: string) => {
    setRequestLinks((prev) => prev.filter((u) => u !== url));
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length) {
      setRequestImageFiles((prev) => [...prev, ...Array.from(files)]);
    }
    e.target.value = '';
  };

  const removeImageFile = (index: number) => {
    setRequestImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('productCollab.productNameRequired'));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onCreate({
        name: trimmed,
        category: category || null,
        request_note: requestNote.trim() || null,
        request_links: requestLinks.length ? requestLinks : null,
        requestImageFiles,
      });
      setName('');
      setCategory('');
      setRequestNote('');
      setRequestLinks([]);
      setLinkInput('');
      setRequestImageFiles([]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('productCollab.createFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setName('');
      setCategory('');
      setRequestNote('');
      setRequestLinks([]);
      setLinkInput('');
      setRequestImageFiles([]);
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={handleClose}>
      <div
        className="bg-white rounded-lg shadow-lg w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[#1F2937] mb-4">{t('productCollab.registerProduct')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1F2937] mb-1">{t('productCollab.productName')} *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-[#1F2937] text-sm"
              placeholder={t('productCollab.productNamePlaceholder')}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1F2937] mb-1">{t('productCollab.category')}</label>
            <select
              value={category}
              onChange={(e) => setCategory((e.target.value || '') as ProductCollabCategory | '')}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-[#1F2937] text-sm"
            >
              {CATEGORY_VALUES.map((val) => (
                <option key={val || 'none'} value={val}>
                  {val === '' ? t('productCollab.categoryNone') : t('productCollab.category' + val)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1F2937] mb-1">{t('productCollab.requestNote')}</label>
            <textarea
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-[#1F2937] text-sm min-h-[80px] resize-y"
              placeholder={t('productCollab.requestNotePlaceholder')}
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1F2937] mb-1">{t('productCollab.requestLinks')}</label>
            <div className="flex gap-2 mb-1">
              <input
                type="url"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLink())}
                placeholder={t('productCollab.requestLinksPlaceholder')}
                className="flex-1 min-w-0 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm"
              />
              <button type="button" onClick={addLink} className="px-3 py-2 text-sm text-[#2563EB] border border-[#2563EB] rounded-lg hover:bg-[#EFF6FF]">
                {t('productCollab.requestLinksAdd')}
              </button>
            </div>
            {requestLinks.length > 0 && (
              <ul className="space-y-1 text-sm">
                {requestLinks.map((url) => (
                  <li key={url} className="flex items-center gap-2">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] truncate flex-1 min-w-0" title={url}>{url}</a>
                    <button type="button" onClick={() => removeLink(url)} className="text-[#6B7280] hover:text-red-600 shrink-0">×</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1F2937] mb-1">{t('productCollab.requestImages')}</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              className="hidden"
              onChange={onFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 text-sm text-[#2563EB] border border-[#2563EB] rounded-lg hover:bg-[#EFF6FF]"
            >
              {t('productCollab.uploadRequestImage')}
            </button>
            {requestImageFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {requestImageFiles.map((file, index) => (
                  <RequestImagePreview key={`${file.name}-${index}`} file={file} onRemove={() => removeImageFile(index)} />
                ))}
              </div>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-[#1F2937] hover:bg-[#F3F4F6] rounded-lg"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-[#1D4ED8] disabled:opacity-50"
            >
              {submitting ? t('productCollab.creating') : t('productCollab.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
