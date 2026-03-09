import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { getActiveProducts, createProduct } from '../../../api/productCollabApi';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { ProductCollabProductListItem } from '../types';
import { getProductCollabImageUrl } from '../utils/imageUrl';
import { ImageModal } from '../shared/ImageModal';
import { CreateProductModal } from './CreateProductModal';
import { ProductListFilters, type ProductListFiltersValue } from './ProductListFilters';

const defaultFilters: ProductListFiltersValue = {
  search: '',
  status: '',
  category: '',
};

export function ProductCollabList() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [list, setList] = useState<ProductCollabProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProductListFiltersValue>(defaultFilters);

  const loadList = () => {
    getActiveProducts({
      search: filters.search.trim() || undefined,
      status: filters.status || undefined,
      category: filters.category || undefined,
    }).then((res) => {
      setLoading(false);
      if (res.success && res.data) setList(res.data);
      else setError(res.error ?? t('productCollab.loadFailed'));
    });
  };

  useEffect(() => {
    loadList();
  }, []);

  const handleApplyFilters = () => {
    setLoading(true);
    getActiveProducts({
      search: filters.search.trim() || undefined,
      status: filters.status || undefined,
      category: filters.category || undefined,
    }).then((res) => {
      setLoading(false);
      if (res.success && res.data) setList(res.data);
    });
  };

  const handleCreate = async (payload: { name: string; category: import('../types').ProductCollabCategory | null; request_note: string | null }) => {
    const res = await createProduct({ name: payload.name, category: payload.category, request_note: payload.request_note });
    if (!res.success) throw new Error(res.error);
    loadList();
    if (res.data && typeof res.data === 'object' && 'id' in res.data) {
      navigate(`/admin/product-collab/thread/${(res.data as { id: number }).id}`);
    }
  };

  if (loading) return <div className="p-6 text-[#1F2937]">{t('productCollab.loading')}</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-[#1F2937]">{t('productCollab.productList')}</h1>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-[#1D4ED8]"
        >
          <Plus className="w-4 h-4" />
          {t('productCollab.registerProduct')}
        </button>
      </div>
      <ProductListFilters
        value={filters}
        onChange={setFilters}
        onApply={handleApplyFilters}
      />
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {list.map((p) => {
          const imgSrc = getProductCollabImageUrl(p.main_image_url);
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
                <img
                  src={imgSrc}
                  alt=""
                  className="w-full h-full object-contain cursor-pointer"
                />
              </button>
            ) : (
              <div className="w-full h-32 bg-[#E5E7EB] rounded mb-3 flex items-center justify-center text-[#6B7280] text-sm">
                {t('productCollab.noImage')}
              </div>
            )}
            <div className="font-medium text-[#1F2937]">{p.name}</div>
            <div className="text-xs text-[#6B7280] mt-1">{p.status}</div>
            {p.assignee_name && (
              <div className="text-xs text-[#6B7280]">{t('productCollab.assignee')}: {p.assignee_name}</div>
            )}
            <div className="text-xs text-[#6B7280] mt-1">
              {new Date(p.last_activity_at).toLocaleString('ko-KR')}
            </div>
          </div>
          );
        })}
      </div>
      <ImageModal imageUrl={modalImageUrl} onClose={() => setModalImageUrl(null)} />
      {list.length === 0 && (
        <p className="text-[#6B7280] text-sm">{t('productCollab.noProducts')}</p>
      )}
      <CreateProductModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
