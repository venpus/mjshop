import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProductById, updateProduct } from '../../../api/productCollabApi';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { ProductCollabProductDetail, ProductCollabMessage } from '../types';
import { ThreadComposer } from './ThreadComposer';
import { ThreadMessageList } from './ThreadMessageList';
import { MainImageSection } from './MainImageSection';
import { SpecForm } from '../shared/SpecForm';
import { OrderFlowButtons } from '../shared/OrderFlowButtons';

export function ProductCollabThread() {
  const { t } = useLanguage();
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductCollabProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRequestNote, setEditingRequestNote] = useState(false);
  const [requestNoteDraft, setRequestNoteDraft] = useState('');
  const [savingRequestNote, setSavingRequestNote] = useState(false);
  const [requestNoteError, setRequestNoteError] = useState<string | null>(null);

  const id = productId ? parseInt(productId, 10) : NaN;

  const loadProduct = () => {
    if (isNaN(id)) {
      setLoading(false);
      setError(t('productCollab.invalidProductId'));
      return;
    }
    getProductById(id).then((res) => {
      setLoading(false);
      if (res.success && res.data) setProduct(res.data);
      else setError(res.error ?? t('productCollab.loadFailed'));
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

  const currentUserId = useMemo(() => {
    try {
      const saved = localStorage.getItem('admin_user');
      if (saved) {
        const u = JSON.parse(saved);
        return (u?.id as string) ?? null;
      }
    } catch {
      // ignore
    }
    return null;
  }, []);

  if (loading) return <div className="p-6 text-[#1F2937]">{t('productCollab.loading')}</div>;
  if (error || !product) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error ?? t('productCollab.productNotFound')}</p>
        <button
          type="button"
          onClick={() => navigate('/admin/product-collab/list')}
          className="mt-2 text-[#2563EB] text-sm"
        >
          {t('productCollab.backToList')}
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/admin/product-collab/list')}
          className="text-[#2563EB] text-sm"
        >
          ← {t('productCollab.list')}
        </button>
        <h1 className="text-lg font-semibold text-[#1F2937]">{product.name}</h1>
        <span className="text-xs text-[#6B7280]">{product.status}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <MainImageSection
          productId={product.id}
          mainImageId={product.main_image_id ?? undefined}
          mainImageUrl={product.main_image_url ?? null}
          productImages={product.product_images ?? []}
          onUpdate={loadProduct}
        />
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-medium text-[#1F2937]">{t('productCollab.requestNoteSection')}</h3>
            {!editingRequestNote ? (
              <button
                type="button"
                onClick={() => {
                  setRequestNoteDraft(product.request_note ?? '');
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
            <div className="space-y-2">
              <textarea
                value={requestNoteDraft}
                onChange={(e) => setRequestNoteDraft(e.target.value)}
                placeholder={t('productCollab.requestNotePlaceholder')}
                className="w-full min-h-[80px] px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm resize-y"
                disabled={savingRequestNote}
              />
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
          ) : product.request_note?.trim() ? (
            <div className="space-y-2">
              <p className="text-sm text-[#1F2937] whitespace-pre-wrap">{product.request_note}</p>
              {product.request_note_translated?.trim() && (
                <p className="text-sm whitespace-pre-wrap border-l-2 border-[#93C5FD] pl-2 text-[#1d4ed8]">
                  {product.request_note_translated}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-[#6B7280]">{t('productCollab.noRequestNote')}</p>
          )}
        </div>
      </div>

      <OrderFlowButtons
        productId={product.id}
        status={product.status}
        mainImageId={product.main_image_id}
        specFilled={specFilled}
        onStatusChange={loadProduct}
      />

      <SpecForm
        productId={product.id}
        initial={{
          price: product.price,
          moq: product.moq,
          lead_time: product.lead_time,
          packaging: product.packaging,
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
