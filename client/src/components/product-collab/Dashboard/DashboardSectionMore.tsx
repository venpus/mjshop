import { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getDashboardSection, completeTask } from '../../../api/productCollabApi';
import type { DashboardSectionKey } from '../../../api/productCollabApi';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getDashboardShowBothLanguages } from '../../../constants/settings';
import type {
  DashboardMyTask,
  DashboardConfirmation,
  DashboardReplyItem,
  DashboardAllAssigneeTask,
} from '../types';

const SECTION_KEYS: DashboardSectionKey[] = ['my-tasks', 'confirmations', 'replies', 'assignee-tasks'];
const PAGE_SIZE = 15;

export function DashboardSectionMore() {
  const { t, language } = useLanguage();
  const { section } = useParams<{ section: string }>();
  const [items, setItems] = useState<unknown[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<number | null>(null);

  const sectionKey = section as DashboardSectionKey | undefined;
  const isValidSection = sectionKey && SECTION_KEYS.includes(sectionKey);

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

  const showBothLanguages = getDashboardShowBothLanguages();
  const bodyForLanguage = (item: { body?: string | null; body_translated?: string | null; body_lang?: string | null }) => {
    const body = item.body ?? '';
    const translated = item.body_translated?.trim() || null;
    const bodyLang = item.body_lang ?? null;
    if (bodyLang == null) return body;
    if (language === bodyLang) return body;
    return translated || body;
  };

  useEffect(() => {
    if (!isValidSection) return;
    setLoading(true);
    getDashboardSection(sectionKey, { limit: PAGE_SIZE, offset: page * PAGE_SIZE }).then((res) => {
      setLoading(false);
      if (res.success && res.data) {
        setItems(res.data.items ?? []);
        setTotal(res.data.total ?? 0);
      } else setError(res.error ?? t('productCollab.loadFailed'));
    });
  }, [sectionKey, page, isValidSection]);

  useEffect(() => {
    setPage(0);
  }, [sectionKey]);

  if (!isValidSection) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <p className="text-red-600">{t('productCollab.loadFailed')}</p>
        <Link to="/admin/product-collab" className="text-[#2563EB] hover:underline mt-2 inline-block">
          {t('productCollab.backToList')}
        </Link>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min((page + 1) * PAGE_SIZE, total);

  const Pagination = () => (
    <nav className="flex items-center justify-between gap-2 flex-wrap py-2" aria-label="Pagination">
      <p className="text-sm text-[#6B7280]">
        {total === 0 ? `0 / 0` : `${from}-${to} / ${total}`}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 0}
          onClick={() => setPage((p) => p - 1)}
          className="px-3 py-1.5 text-sm border rounded border-[#D1D5DB] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F9FAFB]"
        >
          {t('productCollab.prev')}
        </button>
        <span className="px-2 text-sm text-[#6B7280]">
          {page + 1} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages - 1}
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-1.5 text-sm border rounded border-[#D1D5DB] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F9FAFB]"
        >
          {t('productCollab.next')}
        </button>
      </div>
    </nav>
  );

  const handleCompleteTask = async (productId: number, taskId: number) => {
    setCompletingTaskId(taskId);
    setItems((prev) => prev.filter((x: unknown) => (x as { task_id?: number }).task_id !== taskId));
    const res = await completeTask(productId, taskId);
    setCompletingTaskId(null);
    if (!res.success) {
      getDashboardSection(sectionKey, { limit: PAGE_SIZE, offset: page * PAGE_SIZE }).then((r) => {
        if (r.success && r.data) setItems(r.data.items ?? []);
      });
    }
  };

  const sectionTitle =
    sectionKey === 'my-tasks'
      ? t('productCollab.myTasksSection')
      : sectionKey === 'confirmations'
        ? t('productCollab.confirmationsReceivedSection')
        : sectionKey === 'replies'
          ? t('productCollab.repliesToMyMessagesSection')
          : t('productCollab.allAssigneeTasksSection');

  if (loading && items.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Link to="/admin/product-collab" className="text-[#2563EB] hover:underline text-sm mb-4 inline-block">
          ← {t('productCollab.dashboard')}
        </Link>
        <p className="text-[#6B7280]">{t('productCollab.loading')}</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Link to="/admin/product-collab" className="text-[#2563EB] hover:underline text-sm mb-4 inline-block">
          ← {t('productCollab.dashboard')}
        </Link>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link to="/admin/product-collab" className="text-[#2563EB] hover:underline text-sm">
          ← {t('productCollab.dashboard')}
        </Link>
        <h1 className="text-xl font-bold text-[#1F2937]">{sectionTitle}</h1>
      </div>

      <Pagination />

      <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
        <ul className="divide-y divide-[#F3F4F6]">
          {sectionKey === 'my-tasks' &&
            (items as DashboardMyTask[]).map((tItem) => (
              <li key={tItem.task_id} className="p-4 flex items-center justify-between gap-3 hover:bg-[#F9FAFB]">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={`/admin/product-collab/thread/${tItem.product_id}`} className="text-[#2563EB] hover:underline font-medium">
                      {tItem.product_name}
                    </Link>
                    <span className="text-[#6B7280] text-xs">
                      {tItem.completed_at ? t('productCollab.statusDone') : t('productCollab.statusInProgress')}
                    </span>
                  </div>
                  {(showBothLanguages ? (tItem.body?.trim() || tItem.body_translated?.trim()) : bodyForLanguage(tItem).trim()) && (
                    <div className="text-sm text-[#374151] mt-1">
                      {showBothLanguages ? (
                        <>
                          {tItem.body?.trim() && <p className="line-clamp-2">{tItem.body.trim()}</p>}
                          {tItem.body_translated?.trim() && (
                            <p className="line-clamp-2 border-l-2 border-[#E5E7EB] pl-2 text-[#6B7280] mt-0.5">{tItem.body_translated.trim()}</p>
                          )}
                        </>
                      ) : (
                        <p className="line-clamp-2">{bodyForLanguage(tItem).trim()}</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link to={`/admin/product-collab/thread/${tItem.product_id}`} className="px-2 py-1 text-xs text-[#2563EB] hover:bg-[#EFF6FF] rounded">
                    {t('productCollab.viewThread')}
                  </Link>
                  {!tItem.completed_at && (
                    <button
                      type="button"
                      disabled={completingTaskId === tItem.task_id}
                      onClick={() => handleCompleteTask(tItem.product_id, tItem.task_id)}
                      className="px-2 py-1 text-xs text-white bg-[#10B981] hover:bg-[#059669] rounded disabled:opacity-50"
                    >
                      {t('productCollab.statusDone')}
                    </button>
                  )}
                </div>
              </li>
            ))}
          {sectionKey === 'confirmations' &&
            (items as DashboardConfirmation[]).map((c) => (
              <li key={c.task_id} className="p-4 flex items-center justify-between gap-3 hover:bg-[#F9FAFB]">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={`/admin/product-collab/thread/${c.product_id}`} className="text-[#2563EB] hover:underline font-medium">
                      {c.product_name}
                    </Link>
                    <span className="text-[#059669] text-xs font-medium">
                      {t('productCollab.confirmationBy').replace('{name}', c.assignee_name ?? c.assignee_id)}
                    </span>
                  </div>
                  {(showBothLanguages ? (c.body?.trim() || c.body_translated?.trim()) : bodyForLanguage(c).trim()) && (
                    <div className="text-sm text-[#374151] mt-1">
                      {showBothLanguages ? (
                        <>
                          {c.body?.trim() && <p className="line-clamp-2">{c.body.trim()}</p>}
                          {c.body_translated?.trim() && (
                            <p className="line-clamp-2 border-l-2 border-[#E5E7EB] pl-2 text-[#6B7280] mt-0.5">{c.body_translated.trim()}</p>
                          )}
                        </>
                      ) : (
                        <p className="line-clamp-2">{bodyForLanguage(c).trim()}</p>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-[#6B7280] mt-0.5">{new Date(c.completed_at).toLocaleString('ko-KR')}</p>
                </div>
                <Link to={`/admin/product-collab/thread/${c.product_id}`} className="px-2 py-1 text-xs text-[#2563EB] hover:bg-[#EFF6FF] rounded shrink-0">
                  {t('productCollab.viewThread')}
                </Link>
              </li>
            ))}
          {sectionKey === 'replies' &&
            (items as DashboardReplyItem[]).map((reply) => (
              <li key={reply.message_id} className="p-4 flex items-center justify-between gap-3 hover:bg-[#F9FAFB]">
                <div className="min-w-0 flex-1" style={reply.depth > 1 ? { paddingLeft: Math.min(reply.depth - 1, 5) * 12 } : undefined}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={`/admin/product-collab/thread/${reply.product_id}`} className="text-[#2563EB] hover:underline font-medium">
                      {reply.product_name}
                    </Link>
                    <span className="text-[#6B7280] text-xs">
                      {reply.author_name ?? reply.author_id} · {new Date(reply.created_at).toLocaleString('ko-KR')}
                    </span>
                  </div>
                  {bodyForLanguage(reply).trim() && (
                    <div className="text-sm text-[#374151] mt-1">
                      <p className="line-clamp-2">{bodyForLanguage(reply).trim()}</p>
                    </div>
                  )}
                </div>
                <Link to={`/admin/product-collab/thread/${reply.product_id}`} className="px-2 py-1 text-xs text-[#2563EB] hover:bg-[#EFF6FF] rounded shrink-0">
                  {t('productCollab.viewThread')}
                </Link>
              </li>
            ))}
          {sectionKey === 'assignee-tasks' &&
            (items as DashboardAllAssigneeTask[]).map((tItem) => (
              <li key={tItem.task_id} className="p-4 flex items-center justify-between gap-3 hover:bg-[#F9FAFB]">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-semibold text-[#1D4ED8] bg-[#EFF6FF] shrink-0 min-w-[5rem]">
                      {tItem.assignee_name ?? tItem.assignee_id}
                    </span>
                    <Link to={`/admin/product-collab/thread/${tItem.product_id}`} className="text-[#2563EB] hover:underline font-medium">
                      {tItem.product_name}
                    </Link>
                    <span className="text-[#6B7280] text-xs">
                      {tItem.completed_at ? t('productCollab.statusDone') : t('productCollab.statusInProgress')}
                    </span>
                  </div>
                  {(showBothLanguages ? (tItem.body?.trim() || tItem.body_translated?.trim()) : bodyForLanguage(tItem).trim()) && (
                    <div className="text-sm text-[#374151] mt-1 space-y-0.5 sm:ml-[5.5rem]">
                      {showBothLanguages ? (
                        <>
                          {tItem.body?.trim() && <p className="line-clamp-2">{tItem.body.trim()}</p>}
                          {tItem.body_translated?.trim() && (
                            <p className="line-clamp-2 border-l-2 border-[#E5E7EB] pl-2 text-[#6B7280] mt-0.5">{tItem.body_translated.trim()}</p>
                          )}
                        </>
                      ) : (
                        <p className="line-clamp-2">{bodyForLanguage(tItem).trim()}</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link to={`/admin/product-collab/thread/${tItem.product_id}`} className="px-2 py-1 text-xs text-[#2563EB] hover:bg-[#EFF6FF] rounded">
                    {t('productCollab.viewThread')}
                  </Link>
                  {!tItem.completed_at && tItem.assignee_id === currentUserId && (
                    <button
                      type="button"
                      disabled={completingTaskId === tItem.task_id}
                      onClick={() => handleCompleteTask(tItem.product_id, tItem.task_id)}
                      className="px-2 py-1 text-xs text-white bg-[#10B981] hover:bg-[#059669] rounded disabled:opacity-50"
                    >
                      {t('productCollab.statusDone')}
                    </button>
                  )}
                </div>
              </li>
            ))}
        </ul>
      </div>

      <Pagination />
    </div>
  );
}
