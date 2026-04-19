import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getThreadUnreadItems } from '../../../api/productCollabApi';
import type { ThreadUnreadItem } from '../../../api/productCollabApi';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useProductCollabThreadUnread } from '../../../contexts/ProductCollabThreadUnreadContext';
import { UnreadThreadListRow } from './UnreadThreadListRow';

export function UnreadThreadListPage() {
  const { t } = useLanguage();
  const refreshUnread = useProductCollabThreadUnread()?.refresh;
  const [items, setItems] = useState<ThreadUnreadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getThreadUnreadItems();
    setLoading(false);
    if (res.success && res.data) {
      setItems(res.data.items);
    } else {
      setError(res.error ?? t('productCollab.threadUnreadListLoadFailed'));
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  /** 목록 진입 시 플로팅 배지와 서버 집계 동기화 */
  useEffect(() => {
    void refreshUnread?.();
  }, [refreshUnread]);

  if (loading) {
    return <div className="p-6 text-[#1F2937]">{t('productCollab.loading')}</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error}</p>
        <button type="button" onClick={() => void load()} className="mt-2 text-sm text-[#2563EB]">
          {t('productCollab.threadUnreadListRetry')}
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h1 className="text-lg font-semibold text-[#1F2937]">{t('productCollab.threadUnreadListTitle')}</h1>
        <Link to="/admin/product-collab/list" className="text-sm text-[#2563EB] hover:underline shrink-0">
          ← {t('productCollab.list')}
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-[#6B7280] text-sm py-8 text-center">{t('productCollab.threadUnreadListEmpty')}</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map((item) => (
            <UnreadThreadListRow key={`${item.product_id}-${item.message_id}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
