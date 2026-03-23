import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
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

const PAGE_SIZE = 15; // 5 columns × 3 rows (web)
const MOBILE_BREAKPOINT = 1024; // below = infinite scroll, >= = paging

/** 상태별 뱃지 배경/텍스트 색상 - types의 PRODUCT_COLLAB_STATUS_BADGE_CLASS와 동일 유지 */
const statusBadgeClass: Record<ProductCollabStatus, string> = {
  RESEARCH: 'bg-[#CCFBF1] text-[#115E59]',
  SAMPLE_TEST: 'bg-[#DBEAFE] text-[#1E40AF]',
  CONFIG_CONFIRM: 'bg-[#FEF3C7] text-[#B45309]',
  ORDER_PENDING: 'bg-[#FFEDD5] text-[#C2410C]',
  INCOMING: 'bg-[#E9D5FF] text-[#6B21A8]',
  IN_PRODUCTION: 'bg-[#E0E7FF] text-[#3730A3]',
  PRODUCTION_COMPLETE: 'bg-[#D1FAE5] text-[#047857]',
  ISSUE_OCCURRED: 'bg-[#FEE2E2] text-[#B91C1C]',
  CANCELLED: 'bg-[#FEE2E2] text-[#B91C1C]',
};

function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  );
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    mql.addEventListener('change', onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return isMobile;
}

export function ProductCollabList() {
  const { t, language } = useLanguage();
  const { counts } = useProductCollabCounts() ?? {};
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFromUrl = searchParams.get('status') ?? '';
  const isMobile = useIsMobileViewport();

  const [list, setList] = useState<ProductCollabProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  /** 필터/뷰포트 효과에서 이미 loadPage(1) 했을 때, 같은 틱의 page 효과 중복 요청 방지 */
  const skipNextDesktopPageEffect = useRef(false);

  const [filters, setFilters] = useState<ProductListFiltersValue>(() => ({
    ...defaultFilters,
    status: statusFromUrl,
  }));

  const apiParams = {
    search: filters.search.trim() || undefined,
    status: filters.status || undefined,
    category: filters.category || undefined,
  };

  const loadPage = useCallback(
    (pageNum: number) => {
      setLoading(true);
      getActiveProducts({
        ...apiParams,
        limit: PAGE_SIZE,
        offset: (pageNum - 1) * PAGE_SIZE,
      }).then((res) => {
        setLoading(false);
        if (res.success && res.data) {
          setList(res.data);
          setTotal(res.total ?? res.data.length);
        } else {
          setError(res.error ?? t('productCollab.loadFailed'));
        }
      });
    },
    [apiParams.search, apiParams.status, apiParams.category]
  );

  const loadInitialMobile = useCallback(() => {
    setLoading(true);
    setList([]);
    getActiveProducts({ ...apiParams, limit: PAGE_SIZE, offset: 0 }).then((res) => {
      setLoading(false);
      if (res.success && res.data) {
        setList(res.data);
        setTotal(res.total ?? 0);
      } else {
        setError(res.error ?? t('productCollab.loadFailed'));
      }
    });
  }, [apiParams.search, apiParams.status, apiParams.category, t]);

  const loadMoreMobile = useCallback(() => {
    if (loadingMore || list.length >= total) return;
    setLoadingMore(true);
    getActiveProducts({ ...apiParams, limit: PAGE_SIZE, offset: list.length }).then((res) => {
      setLoadingMore(false);
      if (res.success && res.data && res.data.length > 0) {
        setList((prev) => [...prev, ...res.data!]);
      }
      if (res.success && res.total != null) setTotal(res.total);
    });
  }, [apiParams.search, apiParams.status, apiParams.category, list.length, total, loadingMore]);

  useEffect(() => {
    if (isMobile) {
      loadInitialMobile();
    } else {
      setPage(1);
      loadPage(1);
      skipNextDesktopPageEffect.current = true;
    }
  }, [isMobile, filters.status, filters.search, filters.category]);

  useEffect(() => {
    if (isMobile) return;
    if (skipNextDesktopPageEffect.current) {
      skipNextDesktopPageEffect.current = false;
      return;
    }
    loadPage(page);
  }, [page, isMobile, loadPage]);

  useEffect(() => {
    if (!isMobile || !sentinelRef.current || list.length >= total || loading || loadingMore) return;
    const el = sentinelRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreMobile();
      },
      { root: null, rootMargin: '200px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isMobile, list.length, total, loading, loadingMore, loadMoreMobile]);

  const handleApplyFilters = () => {
    setError(null);
    if (isMobile) {
      loadInitialMobile();
    } else {
      setPage(1);
      loadPage(1);
      skipNextDesktopPageEffect.current = true;
    }
  };

  const hasActiveFilters = Boolean(
    (filters.search && filters.search.trim()) || filters.status || filters.category
  );
  const handleClearFilters = () => {
    setFilters(defaultFilters);
    setSearchParams({});
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
        throw new Error(t('productCollab.loadFailed'));
      }
    }
    if (isMobile) loadInitialMobile();
    else loadPage(page);
    navigate(`/admin/product-collab/thread/${productId}`);
  };

  const handleCancelProduct = async (e: React.MouseEvent, productId: number) => {
    e.stopPropagation();
    if (!window.confirm(t('productCollab.cancelProductConfirm'))) return;
    setCancellingId(productId);
    const res = await updateProduct(productId, { status: 'CANCELLED' });
    setCancellingId(null);
    if (res.success) {
      if (isMobile) loadInitialMobile();
      else loadPage(page);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pagination = !isMobile && total > 0 && (
    <nav className="flex items-center justify-center gap-1 flex-wrap" aria-label="페이지 네비게이션">
      <button
        type="button"
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        disabled={page <= 1}
        className="p-2 rounded-lg border border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <span className="px-3 py-2 text-sm text-[#6B7280]">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        disabled={page >= totalPages}
        className="p-2 rounded-lg border border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </nav>
  );

  if (loading && list.length === 0) {
    return <div className="p-6 text-[#1F2937]">{t('productCollab.loading')}</div>;
  }
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
      {hasActiveFilters && (
        <div className="mt-2">
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-sm text-[#6B7280] hover:text-[#374151] underline"
          >
            {t('productCollab.clearFilters')}
          </button>
        </div>
      )}

      {/* 웹: 상단 페이징 */}
      {pagination}

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
              className={`relative bg-white rounded-lg border p-4 text-left hover:border-[#2563EB] transition-colors cursor-pointer ${
                p.status === 'ISSUE_OCCURRED' ? 'border-2 border-red-500' : 'border border-[#E5E7EB]'
              }`}
            >
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

      {/* 모바일: 무한 스크롤 감지용 센티넬 */}
      {isMobile && <div ref={sentinelRef} className="h-4" aria-hidden />}
      {isMobile && loadingMore && (
        <p className="text-center text-sm text-[#6B7280] py-4">{t('productCollab.loading')}</p>
      )}

      {/* 웹: 하단 페이징 */}
      {pagination}

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
