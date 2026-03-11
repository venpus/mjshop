import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCompletedProducts, updateProduct } from '../../../api/productCollabApi';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useProductCollabCounts } from '../ProductCollabCountsContext';
import type { ProductCollabProductListItem } from '../types';
import { getProductCollabImageUrl } from '../utils/imageUrl';

export function ProductCollabArchive() {
  const { t } = useLanguage();
  const { counts } = useProductCollabCounts() ?? {};
  const navigate = useNavigate();
  const [list, setList] = useState<ProductCollabProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [holdingId, setHoldingId] = useState<number | null>(null);

  const loadList = () => {
    getCompletedProducts().then((res) => {
      setLoading(false);
      if (res.success && res.data) setList(res.data);
      else setError(res.error ?? t('productCollab.loadFailed'));
    });
  };

  useEffect(() => {
    loadList();
  }, []);

  const handleHold = async (e: React.MouseEvent, productId: number) => {
    e.stopPropagation();
    setHoldingId(productId);
    const res = await updateProduct(productId, { status: 'ORDER_PENDING' });
    setHoldingId(null);
    if (res.success) loadList();
  };

  if (loading) return <div className="p-6 text-[#1F2937]">{t('productCollab.loading')}</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-lg font-semibold text-[#1F2937] mb-4">
        {t('productCollab.archive')}
        {counts && (
          <span className="ml-2 text-base font-medium text-[#6B7280]">({counts.archiveCount})</span>
        )}
      </h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {list.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-lg border border-[#E5E7EB] p-4 hover:border-[#2563EB] transition-colors flex flex-col"
          >
            <button
              type="button"
              onClick={() => navigate(`/admin/product-collab/thread/${p.id}`)}
              className="text-left flex-1 min-w-0"
            >
              {p.main_image_url ? (
                <div className="w-full h-32 bg-[#F3F4F6] rounded mb-3 flex items-center justify-center overflow-hidden">
                  <img
                    src={getProductCollabImageUrl(p.main_image_url)}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-full h-32 bg-[#E5E7EB] rounded mb-3 flex items-center justify-center text-[#6B7280] text-sm">
                  {t('productCollab.noImage')}
                </div>
              )}
              <div className="font-medium text-[#1F2937]">{p.name}</div>
              <div className="text-xs text-[#6B7280] mt-1">{t('productCollab.statusProductionComplete')}</div>
              <div className="text-xs text-[#6B7280] mt-1">
                {new Date(p.last_activity_at).toLocaleString('ko-KR')}
              </div>
            </button>
            <button
              type="button"
              onClick={(e) => handleHold(e, p.id)}
              disabled={holdingId === p.id}
              className="mt-2 w-full px-3 py-2 text-sm font-medium text-amber-800 bg-amber-100 rounded-lg hover:bg-amber-200 disabled:opacity-50"
            >
              {holdingId === p.id ? t('productCollab.processing') : t('productCollab.holdOrder')}
            </button>
          </div>
        ))}
      </div>
      {list.length === 0 && (
        <p className="text-[#6B7280] text-sm">{t('productCollab.noArchiveProducts')}</p>
      )}
    </div>
  );
}
