import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCancelledProducts, updateProduct } from '../../../api/productCollabApi';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useProductCollabCounts } from '../ProductCollabCountsContext';
import type { ProductCollabProductListItem } from '../types';
import { PRODUCT_COLLAB_STATUS_LABEL_KEYS } from '../types';
import { getProductCollabImageUrl } from '../utils/imageUrl';
import { ImageModal } from '../shared/ImageModal';

export function ProductCollabCancelled() {
  const { t } = useLanguage();
  const { counts } = useProductCollabCounts() ?? {};
  const navigate = useNavigate();
  const [list, setList] = useState<ProductCollabProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  const loadList = () => {
    getCancelledProducts({ search: search.trim() || undefined }).then((res) => {
      setLoading(false);
      if (res.success && res.data) setList(res.data);
      else setError(res.error ?? t('productCollab.loadFailed'));
    });
  };

  useEffect(() => {
    loadList();
  }, []);

  const handleSearch = () => {
    setLoading(true);
    getCancelledProducts({ search: search.trim() || undefined }).then((res) => {
      setLoading(false);
      if (res.success && res.data) setList(res.data);
    });
  };

  const handleRestore = async (e: React.MouseEvent, productId: number) => {
    e.stopPropagation();
    if (!window.confirm(t('productCollab.restoreProductConfirm'))) return;
    setRestoringId(productId);
    const res = await updateProduct(productId, { status: 'RESEARCH' });
    setRestoringId(null);
    if (res.success) loadList();
  };

  if (loading && list.length === 0) return <div className="p-6 text-[#1F2937]">{t('productCollab.loading')}</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-lg font-semibold text-[#1F2937] mb-4">
        {t('productCollab.cancelledList')}
        {counts && (
          <span className="ml-2 text-base font-medium text-[#6B7280]">({counts.cancelledCount})</span>
        )}
      </h1>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={t('common.search')}
          className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm min-w-[180px]"
        />
        <button
          type="button"
          onClick={handleSearch}
          className="px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-[#1D4ED8]"
        >
          {t('common.apply')}
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {list.map((p) => {
          const imgSrc = getProductCollabImageUrl(p.main_image_url ?? p.request_first_image_url);
          return (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/admin/product-collab/thread/${p.id}`)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/admin/product-collab/thread/${p.id}`)}
              className="bg-white rounded-lg border border-[#E5E7EB] p-4 text-left hover:border-[#2563EB] transition-colors cursor-pointer"
            >
              {imgSrc ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setModalImageUrl(imgSrc); }}
                  className="w-full h-32 bg-[#F3F4F6] rounded mb-3 flex items-center justify-center overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                >
                  <img src={imgSrc} alt="" className="w-full h-full object-contain cursor-pointer" />
                </button>
              ) : (
                <div className="w-full h-32 bg-[#E5E7EB] rounded mb-3 flex items-center justify-center text-[#6B7280] text-sm">
                  {t('productCollab.noImage')}
                </div>
              )}
              <div className="font-medium text-[#1F2937]">{p.name}</div>
              <div className="text-xs text-[#6B7280] mt-1">{t(PRODUCT_COLLAB_STATUS_LABEL_KEYS[p.status] ?? 'productCollab.statusCancelled')}</div>
              <div className="text-xs text-[#6B7280] mt-1">
                {new Date(p.last_activity_at).toLocaleString('ko-KR')}
              </div>
              <button
                type="button"
                onClick={(e) => handleRestore(e, p.id)}
                disabled={restoringId === p.id}
                className="mt-2 w-full py-1.5 text-xs font-medium text-[#2563EB] bg-[#EFF6FF] border border-[#2563EB] rounded hover:bg-[#DBEAFE] disabled:opacity-50"
              >
                {restoringId === p.id ? t('productCollab.processing') : t('productCollab.restoreProduct')}
              </button>
            </div>
          );
        })}
      </div>
      <ImageModal imageUrl={modalImageUrl} onClose={() => setModalImageUrl(null)} />
      {list.length === 0 && (
        <p className="text-[#6B7280] text-sm">{t('productCollab.noCancelledProducts')}</p>
      )}
    </div>
  );
}
