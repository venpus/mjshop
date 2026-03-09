import { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { ProductCollabCategory } from '../types';

const CATEGORY_VALUES: (ProductCollabCategory | '')[] = ['', 'Plush', 'Goods', 'Figure'];

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: { name: string; category: ProductCollabCategory | null; request_note: string | null }) => Promise<void>;
}

export function CreateProductModal({ isOpen, onClose, onCreate }: CreateProductModalProps) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCollabCategory | ''>('');
  const [requestNote, setRequestNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      });
      setName('');
      setCategory('');
      setRequestNote('');
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
