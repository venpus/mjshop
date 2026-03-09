import { useState, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { ChevronDown, ChevronUp } from 'lucide-react';

const FIELDS = [
  { key: 'price', labelKey: 'productCollab.price' },
  { key: 'moq', labelKey: 'productCollab.moq' },
  { key: 'lead_time', labelKey: 'productCollab.leadTime' },
  { key: 'packaging', labelKey: 'productCollab.packaging' },
  { key: 'sku_count', labelKey: 'productCollab.skuCount' },
] as const;

type SpecKey = (typeof FIELDS)[number]['key'];

interface SpecFormProps {
  productId: number;
  initial: Record<SpecKey, string | null>;
  onSave: () => void;
}

export function SpecForm({ productId, initial, onSave }: SpecFormProps) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [values, setValues] = useState<Record<SpecKey, string>>(() =>
    FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: initial[f.key] ?? '' }), {} as Record<SpecKey, string>)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValues(
      FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: initial[f.key] ?? '' }), {} as Record<SpecKey, string>)
    );
  }, [initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const { updateProduct } = await import('../../../api/productCollabApi');
      const body: Record<string, string | null> = {};
      FIELDS.forEach((f) => {
        body[f.key] = values[f.key].trim() || null;
      });
      const res = await updateProduct(productId, body);
      if (!res.success) throw new Error(res.error);
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('productCollab.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-[#E5E7EB] p-4">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between text-left mb-0 -mx-1 px-1 py-0.5 rounded hover:bg-[#F3F4F6]"
      >
        <h3 className="text-sm font-medium text-[#1F2937]">{t('productCollab.spec')}</h3>
        <span className="text-[#6B7280]" aria-hidden>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>
      {expanded && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            {FIELDS.map(({ key, labelKey }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">{t(labelKey)}</label>
                <input
                  type="text"
                  value={values[key]}
                  onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-[#1F2937] text-sm"
                />
              </div>
            ))}
          </div>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          <div className="mt-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-[#1D4ED8] disabled:opacity-50"
            >
              {saving ? t('productCollab.saving') : t('productCollab.specSave')}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
