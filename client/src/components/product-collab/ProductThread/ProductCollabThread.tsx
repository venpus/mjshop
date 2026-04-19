import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getProductById, updateProduct, uploadProductImages, deleteProduct } from '../../../api/productCollabApi';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getAdminUser } from '../../../utils/authStorage';
import { useProductCollabCounts } from '../ProductCollabCountsContext';
import { useProductCollabThreadUnread } from '../../../contexts/ProductCollabThreadUnreadContext';
import type { ProductCollabProductDetail, ProductCollabMessage } from '../types';
import { getProductCollabImageUrl } from '../utils/imageUrl';
import { ImageModal } from '../shared/ImageModal';
import { ThreadComposer } from './ThreadComposer';
import { ThreadMessageList } from './ThreadMessageList';
import { MainImageSection } from './MainImageSection';
import { SpecForm } from '../shared/SpecForm';

export function ProductCollabThread() {
  const { t } = useLanguage();
  const countsContext = useProductCollabCounts();
  const threadUnread = useProductCollabThreadUnread();
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromSummary = searchParams.get('from') === 'summary';
  const fromUnread = searchParams.get('from') === 'unread';
  const [product, setProduct] = useState<ProductCollabProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRequestNote, setEditingRequestNote] = useState(false);
  const [requestNoteDraft, setRequestNoteDraft] = useState('');
  const [requestLinksDraft, setRequestLinksDraft] = useState<string[]>([]);
  const [requestImageUrlsDraft, setRequestImageUrlsDraft] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState('');
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingRequestNote, setSavingRequestNote] = useState(false);
  const [requestNoteError, setRequestNoteError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const requestImageInputRef = useRef<HTMLInputElement>(null);

  const id = productId ? parseInt(productId, 10) : NaN;

  const loadProduct = () => {
    if (isNaN(id)) {
      setLoading(false);
      setError(t('productCollab.invalidProductId'));
      return;
    }
    getProductById(id).then((res) => {
      setLoading(false);
      if (res.success && res.data) {
        setProduct(res.data);
        void threadUnread?.markThreadViewed(id).then(() => threadUnread?.refresh());
      } else setError(res.error ?? t('productCollab.loadFailed'));
    });
  };

  useEffect(() => {
    loadProduct();
  }, [productId]);

  /** 새 메시지 전송 시 전체 리프레시 없이 목록에만 반영 */
  const handleMessageSent = (newMessage?: ProductCollabMessage) => {
    if (newMessage) {
      setProduct((prev) =>
        prev
          ? {
              ...prev,
              messages: [{ ...newMessage, replies: newMessage.replies ?? [] }, ...(prev.messages ?? [])],
            }
          : prev
      );
    } else {
      loadProduct();
    }
  };

  /** 답글 전송 시 해당 메시지의 replies에만 반영 */
  const handleReplySent = (parentMessageId: number, newReply: ProductCollabMessage) => {
    setProduct((prev) =>
      prev
        ? {
            ...prev,
            messages: (prev.messages ?? []).map((m) =>
              m.id === parentMessageId ? { ...m, replies: [...(m.replies ?? []), newReply] } : m
            ),
          }
        : prev
    );
  };

  const specFilled =
    !!product &&
    !!(product.price?.trim() || product.moq?.trim() || product.lead_time?.trim());

  const currentUserId = useMemo(() => getAdminUser()?.id ?? null, []);

  /** 스레드 내 메시지·답글 중 가장 최근 번역에 사용된 AI (제품명 옆 표기용) */
  const latestTranslationProvider = useMemo((): 'openai' | 'qwen' | null => {
    if (!product?.messages?.length) return null;
    const all: { created_at: string; body_translation_provider?: 'openai' | 'qwen' | null }[] = [];
    for (const m of product.messages) {
      if (m.body_translation_provider) all.push({ created_at: m.created_at, body_translation_provider: m.body_translation_provider });
      for (const r of m.replies ?? []) {
        if (r.body_translation_provider) all.push({ created_at: r.created_at, body_translation_provider: r.body_translation_provider });
      }
    }
    if (all.length === 0) return null;
    all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return all[0].body_translation_provider ?? null;
  }, [product?.messages]);

  if (loading) return <div className="p-6 text-[#1F2937]">{t('productCollab.loading')}</div>;
  if (error || !product) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error ?? t('productCollab.productNotFound')}</p>
        <button
          type="button"
          onClick={() =>
            navigate(fromUnread ? '/admin/product-collab/unread' : '/admin/product-collab/list')
          }
          className="mt-2 text-[#2563EB] text-sm"
        >
          {fromUnread ? t('productCollab.backToUnreadList') : t('productCollab.backToList')}
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        {fromUnread ? (
          <button
            type="button"
            onClick={() => navigate('/admin/product-collab/unread')}
            className="text-[#2563EB] text-sm"
          >
            ← {t('productCollab.backToUnreadList')}
          </button>
        ) : fromSummary ? (
          <button
            type="button"
            onClick={() => navigate('/admin/product-collab')}
            className="text-[#2563EB] text-sm"
          >
            ← {t('productCollab.backToSummary')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/admin/product-collab/list')}
            className="text-[#2563EB] text-sm"
          >
            ← {t('productCollab.list')}
          </button>
        )}
        <h1 className="text-lg font-semibold text-[#1F2937]">{product.name}</h1>
        {latestTranslationProvider && (
          <span className="text-xs text-[#6B7280] ml-2">
            {latestTranslationProvider === 'openai' ? t('productCollab.translationByOpenAI') : t('productCollab.translationByQwen')}
          </span>
        )}
        <span className="text-xs text-[#6B7280]">{product.status}</span>
        {product.status !== 'PRODUCTION_COMPLETE' && (
          <button
            type="button"
            onClick={async () => {
              if (!confirm(t('productCollab.deleteProductConfirm'))) return;
              setDeleting(true);
              try {
                const res = await deleteProduct(product.id);
                if (!res.success) throw new Error(res.error);
                await countsContext?.refresh();
                navigate('/admin/product-collab/list');
              } catch (err) {
                alert(err instanceof Error ? err.message : t('productCollab.deleteFailed'));
              } finally {
                setDeleting(false);
              }
            }}
            disabled={deleting}
            className="ml-auto text-sm px-3 py-1.5 text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50"
          >
            {deleting ? t('productCollab.processing') : t('productCollab.deleteProduct')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <MainImageSection
          productId={product.id}
          mainImageId={product.main_image_id ?? undefined}
          mainImageUrl={product.main_image_url ?? null}
          productImages={product.product_images ?? []}
          onUpdate={loadProduct}
          status={product.status ?? 'RESEARCH'}
          onStatusChange={(newStatus) => {
            if (!product?.id || newStatus === (product.status ?? 'RESEARCH')) return;
            setUpdatingStatus(true);
            updateProduct(product.id, { status: newStatus })
              .then((res) => { if (res.success) loadProduct(); })
              .finally(() => setUpdatingStatus(false));
          }}
          updatingStatus={updatingStatus}
        />
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-medium text-[#1F2937]">{t('productCollab.requestNoteSection')}</h3>
            {!editingRequestNote ? (
              <button
                type="button"
                onClick={() => {
                  setRequestNoteDraft(product.request_note ?? '');
                  setRequestLinksDraft(product.request_links ?? []);
                  setRequestImageUrlsDraft(product.request_image_urls ?? []);
                  setLinkInput('');
                  setRequestNoteError(null);
                  setEditingRequestNote(true);
                }}
                className="text-xs text-[#2563EB] hover:underline"
              >
                {t('common.edit')}
              </button>
            ) : null}
          </div>
          {editingRequestNote ? (
            <div className="space-y-3">
              <textarea
                value={requestNoteDraft}
                onChange={(e) => setRequestNoteDraft(e.target.value)}
                placeholder={t('productCollab.requestNotePlaceholder')}
                className="w-full min-h-[80px] px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm resize-y"
                disabled={savingRequestNote}
              />
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">{t('productCollab.requestLinks')}</label>
                <div className="flex gap-2 mb-1">
                  <input
                    type="url"
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const u = linkInput.trim();
                        if (u && !requestLinksDraft.includes(u)) {
                          setRequestLinksDraft((prev) => [...prev, u]);
                          setLinkInput('');
                        }
                      }
                    }}
                    placeholder={t('productCollab.requestLinksPlaceholder')}
                    className="flex-1 min-w-0 px-2 py-1.5 border border-[#E5E7EB] rounded text-sm"
                    disabled={savingRequestNote}
                  />
                  <button type="button" onClick={() => { const u = linkInput.trim(); if (u && !requestLinksDraft.includes(u)) { setRequestLinksDraft((prev) => [...prev, u]); setLinkInput(''); } }} disabled={savingRequestNote} className="px-2 py-1.5 text-xs text-[#2563EB] border border-[#2563EB] rounded hover:bg-[#EFF6FF]">+</button>
                </div>
                {requestLinksDraft.length > 0 && (
                  <ul className="text-sm space-y-0.5">
                    {requestLinksDraft.map((url) => (
                      <li key={url} className="flex items-center gap-1">
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] truncate flex-1 min-w-0">{url}</a>
                        <button type="button" onClick={() => setRequestLinksDraft((p) => p.filter((x) => x !== url))} disabled={savingRequestNote} className="text-[#6B7280] hover:text-red-600">×</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">{t('productCollab.requestImages')}</label>
                <input ref={requestImageInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !product) return;
                  e.target.value = '';
                  setUploadingImage(true);
                  setRequestNoteError(null);
                  try {
                    const res = await uploadProductImages(product.id, [file]);
                    if (!res.success || !res.data?.urls?.[0]) throw new Error(res.error ?? 'Upload failed');
                    setRequestImageUrlsDraft((prev) => [...prev, res.data!.urls![0]]);
                  } catch (err) {
                    setRequestNoteError(err instanceof Error ? err.message : t('productCollab.loadFailed'));
                  } finally {
                    setUploadingImage(false);
                  }
                }} />
                <button type="button" onClick={() => requestImageInputRef.current?.click()} disabled={savingRequestNote || uploadingImage} className="px-2 py-1.5 text-xs text-[#1F2937] bg-[#E5E7EB] rounded hover:bg-[#D1D5DB] disabled:opacity-50">{uploadingImage ? '...' : t('productCollab.uploadRequestImage')}</button>
                {requestImageUrlsDraft.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {requestImageUrlsDraft.map((url) => (
                      <div key={url} className="relative group w-14 h-14 rounded border border-[#E5E7EB] overflow-hidden bg-[#F3F4F6]">
                        <button type="button" onClick={() => setModalImageUrl(getProductCollabImageUrl(url))} className="block w-full h-full">
                          <img src={getProductCollabImageUrl(url)} alt="" className="w-full h-full object-contain" />
                        </button>
                        <button type="button" onClick={() => setRequestImageUrlsDraft((p) => p.filter((x) => x !== url))} disabled={savingRequestNote} className="absolute top-0 right-0 p-0.5 bg-black/50 text-white text-xs rounded-bl">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {requestNoteError && <p className="text-xs text-red-600">{requestNoteError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={savingRequestNote}
                  onClick={async () => {
                    setRequestNoteError(null);
                    setSavingRequestNote(true);
                    try {
                      const res = await updateProduct(product.id, {
                        request_note: requestNoteDraft.trim() || null,
                        request_links: requestLinksDraft.length ? requestLinksDraft : null,
                        request_image_urls: requestImageUrlsDraft.length ? requestImageUrlsDraft : null,
                      });
                      if (!res.success) throw new Error(res.error);
                      setEditingRequestNote(false);
                      loadProduct();
                    } catch (err) {
                      setRequestNoteError(err instanceof Error ? err.message : t('productCollab.loadFailed'));
                    } finally {
                      setSavingRequestNote(false);
                    }
                  }}
                  className="px-3 py-1.5 text-sm text-white bg-[#2563EB] rounded-lg hover:bg-[#1D4ED8] disabled:opacity-50"
                >
                  {t('common.save')}
                </button>
                <button
                  type="button"
                  disabled={savingRequestNote}
                  onClick={() => {
                    setEditingRequestNote(false);
                    setRequestNoteError(null);
                  }}
                  className="px-3 py-1.5 text-sm text-[#6B7280] border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          ) : product.request_note?.trim() || (product.request_links?.length ?? 0) > 0 || (product.request_image_urls?.length ?? 0) > 0 ? (
            <div className="space-y-2">
              {product.request_note?.trim() && (
                <>
                  <p className="text-sm text-[#1F2937] whitespace-pre-wrap">{product.request_note}</p>
                  {product.request_note_translated?.trim() && (
                    <p className="text-sm whitespace-pre-wrap border-l-2 border-[#93C5FD] pl-2 text-[#1d4ed8]">
                      {product.request_note_translated}
                    </p>
                  )}
                </>
              )}
              {(product.request_links?.length ?? 0) > 0 && (
                <div>
                  <span className="text-xs font-medium text-[#6B7280]">{t('productCollab.requestLinks')}: </span>
                  <ul className="mt-0.5 space-y-0.5">
                    {product.request_links!.map((url) => (
                      <li key={url}>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#2563EB] hover:underline break-all">{url}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(product.request_image_urls?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {product.request_image_urls!.map((url) => (
                    <button key={url} type="button" onClick={() => setModalImageUrl(getProductCollabImageUrl(url))} className="w-16 h-16 rounded border border-[#E5E7EB] overflow-hidden bg-[#F3F4F6] focus:outline-none focus:ring-2 focus:ring-[#2563EB]">
                      <img src={getProductCollabImageUrl(url)} alt="" className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-[#6B7280]">{t('productCollab.noRequestNote')}</p>
          )}
        </div>
      </div>
      <ImageModal imageUrl={modalImageUrl} onClose={() => setModalImageUrl(null)} />

      <SpecForm
        productId={product.id}
        initial={{
          price: product.price,
          moq: product.moq,
          lead_time: product.lead_time,
          packaging: product.packaging,
          inner_packaging: product.inner_packaging ?? null,
          sku_count: product.sku_count,
        }}
        onSave={loadProduct}
      />

      <section>
        <h2 className="text-sm font-medium text-[#1F2937] mb-3">{t('productCollab.thread')}</h2>
        <ThreadComposer productId={product.id} onSent={handleMessageSent} />
        <div className="mt-4">
          <ThreadMessageList
            messages={product.messages ?? []}
            productId={product.id}
            currentUserId={currentUserId}
            onMessageUpdated={loadProduct}
            onReplySent={handleReplySent}
          />
        </div>
      </section>
    </div>
  );
}
