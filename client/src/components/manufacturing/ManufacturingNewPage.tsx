import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { createManufacturingDocument } from '../../api/manufacturingApi';

export function ManufacturingNewPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) {
      setError('제품명을 입력하세요.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const doc = await createManufacturingDocument({
        product_name: productName.trim(),
        quantity: quantity || 0,
        product_image: productImage,
      });
      navigate(`/admin/manufacturing/${doc.id}`);
    } catch (err: any) {
      setError(err.message || '생성에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-4">{t('manufacturing.createWithoutPO')}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('manufacturing.productName')}</label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder={t('manufacturing.productName')}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('manufacturing.quantity')}</label>
          <input
            type="number"
            min={0}
            value={quantity || ''}
            onChange={(e) => setQuantity(e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate('/admin/manufacturing')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {saving ? t('common.loading') : t('manufacturing.createNew')}
          </button>
        </div>
      </form>
    </div>
  );
}
