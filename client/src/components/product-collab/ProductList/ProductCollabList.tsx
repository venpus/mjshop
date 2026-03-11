import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { getActiveProducts, createProduct, uploadProductImages, updateProduct } from '../../../api/productCollabApi';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useProductCollabCounts } from '../ProductCollabCountsContext';
import type { ProductCollabProductListItem, ProductCollabStatus } from '../types';
import { PRODUCT_COLLAB_STATUS_LABEL_KEYS } from '../types';
import { getProductCollabImageUrl } from '../utils/imageUrl';
import { ImageModal } from '../shared/ImageModal';
import { CreateProductModal } from './CreateProductModal';
import { ProductListFilters, type ProductListFiltersValue } from './ProductListFilters';

const defaultFilters: ProductListFiltersValue = {
  search: '',
  status: '',
  category: '',
};

/** 상태별 뱃지 배경/텍스트 색상 (회색·흰색·검은색 미사용) */
const statusBadgeClass: Record<ProductCollabStatus, string> = {
  RESEARCH: 'bg-[#CCFBF1] text-[#115E59]',           // teal
  SAMPLE_TEST: 'bg-[#DBEAFE] text-[#1E40AF]',       // blue
  CONFIG_CONFIRM: 'bg-[#FEF3C7] text-[#B45309]',    // amber
  ORDER_PENDING: 'bg-[#FFEDD5] text-[#C2410C]',     // orange
  INCOMING: 'bg-[#E9D5FF] text-[#6B21A8]',          // purple
  IN_PRODUCTION: 'bg-[#E0E7FF] text-[#3730A3]',     // indigo
  PRODUCTION_COMPLETE: 'bg-[#D1FAE5] text-[#047857]', // green
  CANCELLED: 'bg-[#FEE2E2] text-[#B91C1C]',         // red
};

export function ProductCollabList() {
  const { t, language } = useLanguage();
  const { counts } = useProductCollabCounts() ?? {};
  const navigate = useNavigate();
  const [list, setList] = useState<ProductCollabProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
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

  const handleCreate = async (payload: {
    name: string;
    category: import('../types').ProductCollabCategory | null;
    request_note: string | null;
    request_links: string[] | null;
    requestImageFiles: File[];
  }) => {
    const res = await createProduct({
      name: payload.name,
      category: payload.category,
      request_note: payload.request_note,
      request_links: payload.request_links ?? undefined,
    });
    if (!res.success) throw new Error(res.error);
    const product = res.data as { id?: number } | undefined;
    const productId = product?.id;
    if (productId == null || typeof productId !== 'number') {
      throw new Error(t('productCollab.loadFailed'));
    }
    if (payload.requestImageFiles.length > 0) {
      const uploadRes = await uploadProductImages(productId, payload.requestImageFiles);
      if (!uploadRes.success) {
        throw new Error(uploadRes.error ?? t('productCollab.uploadFailed'));
      }
      if (!uploadRes.data?.urls?.length) {
        throw new Error(t('productCollab.noUploadedUrl'));
      }
      const updateRes = await updateProduct(productId, { request_image_urls: uploadRes.data.urls });
      if (!updateRes.success) {
        throw new Error(updateRes.error ?? t('productCollab.loadFailed'));
      }
    }
    loadList();
    navigate(`/admin/product-collab/thread/${productId}`);
  };

  const handleCancelProduct = async (e: React.MouseEvent, productId: number) => {
    e.stopPropagation();
    if (!window.confirm(t('productCollab.cancelProductConfirm'))) return;
    setCancellingId(productId);
    const res = await updateProduct(productId, { status: 'CANCELLED' });
    setCancellingId(null);
    if (res.success) loadList();
  };

  if (loading) return <div className="p-6 text-[#1F2937]">{t('productCollab.loading')}</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-[#1F2937]">
          {t('productCollab.productList')}
          {counts && (
            <span className="ml-2 text-base font-medium text-[#6B7280]">({counts.activeCount})</span>
          )}
        </h1>
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
          const imgSrc = getProductCollabImageUrl(p.main_image_url ?? p.request_first_image_url);
          return (
          <div
            key={p.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/admin/product-collab/thread/${p.id}`)}
            onKeyDown={(e) => e.key === 'Enter' && navigate(`/admin/product-collab/thread/${p.id}`)}
            className="relative bg-white rounded-lg border border-[#E5E7EB] p-4 text-left hover:border-[#2563EB] transition-colors cursor-pointer"
          >
            {/* 좌측 상단 상태 뱃지 */}
            <span
              className={`absolute top-2 left-2 z-10 inline-block px-2 py-1 text-xs font-medium rounded-md shadow-sm ${statusBadgeClass[p.status] ?? statusBadgeClass.RESEARCH}`}
            >
              {t(PRODUCT_COLLAB_STATUS_LABEL_KEYS[p.status] ?? 'productCollab.statusResearch')}
            </span>
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
            {p.assignee_name && (
              <div className="text-xs text-[#6B7280]">{t('productCollab.assignee')}: {p.assignee_name}</div>
            )}
            {(p.last_message_mentions?.length || p.last_message_body) ? (
              <div className="text-xs text-[#6B7280] mt-1 line-clamp-2">
                {p.last_message_mentions?.map((x, i) => (
                  <span key={x.user_id}>
                    {i > 0 ? ' ' : null}
                    <span className="font-semibold text-[#1D4ED8] bg-[#EFF6FF] px-0.5 rounded">
                      @{x.user_name ?? x.user_id}
                    </span>
                  </span>
                ))}
                {p.last_message_mentions?.length ? ' ' : null}
                {(() => {
                  const bodyLang = p.last_message_body_lang ?? null;
                  const body = p.last_message_body ?? '';
                  const translated = p.last_message_body_translated?.trim() || null;
                  if (bodyLang == null) return body;
                  if (language === bodyLang) return body;
                  return translated || body;
                })()}
              </div>
            ) : null}
            <div className="text-xs text-[#6B7280] mt-1">
              {new Date(p.last_activity_at).toLocaleString('ko-KR')}
            </div>
            <button
              type="button"
              onClick={(e) => handleCancelProduct(e, p.id)}
              disabled={cancellingId === p.id}
              className="mt-2 w-full py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 disabled:opacity-50"
            >
              {cancellingId === p.id ? t('productCollab.processing') : t('productCollab.cancelProduct')}
            </button>
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
