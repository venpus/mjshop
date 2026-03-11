import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard, completeTask } from '../../../api/productCollabApi';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useProductCollabCounts } from '../ProductCollabCountsContext';
import type { DashboardData } from '../types';
import { PRODUCT_COLLAB_STATUS_LABEL_KEYS } from '../types';

export function ProductCollabDashboard() {
  const { t } = useLanguage();
  const { counts } = useProductCollabCounts() ?? {};
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<number | null>(null);

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

  const loadDashboard = () => {
    getDashboard().then((res) => {
      setLoading(false);
      if (res.success && res.data) setData(res.data);
      else setError(res.error ?? t('productCollab.loadFailed'));
    });
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) return <div className="p-6 text-[#1F2937]">{t('productCollab.loading')}</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-[#1F2937]">
        {t('productCollab.dashboard')}
        {counts && (
          <span className="ml-2 text-base font-semibold text-[#6B7280]">({counts.activeCount})</span>
        )}
      </h1>

      {/* 내 업무 - 파란 계열 */}
      <section className="rounded-xl border-2 border-[#BFDBFE] overflow-hidden bg-[#EFF6FF]">
        <div className="px-4 py-3 bg-[#DBEAFE] border-b border-[#BFDBFE]">
          <h2 className="text-lg font-semibold text-[#1E40AF]">{t('productCollab.myTasksSection')}</h2>
        </div>
        <div className="p-4 bg-white">
        <p className="text-xs text-[#6B7280] mb-3">{t('productCollab.mentionDesc')}</p>
        {data?.myTasks?.length ? (
          <ul className="space-y-2 text-sm text-[#1F2937]">
            {data.myTasks.slice(0, 20).map((tItem) => (
              <li
                key={tItem.task_id}
                className="flex items-center justify-between gap-3 py-2 border-b border-[#F3F4F6] last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      to={`/admin/product-collab/thread/${tItem.product_id}`}
                      className="text-[#2563EB] hover:underline font-medium"
                    >
                      {tItem.product_name}
                    </Link>
                    <span className="text-[#6B7280] text-xs">
                      {tItem.completed_at ? t('productCollab.statusDone') : t('productCollab.statusInProgress')}
                    </span>
                  </div>
                  {(tItem.body?.trim() || tItem.body_translated?.trim()) && (
                    <div className="text-sm text-[#374151] mt-1 space-y-0.5">
                      {tItem.body?.trim() && (
                        <p className="line-clamp-2">{tItem.body.trim()}</p>
                      )}
                      {tItem.body_translated?.trim() && (
                        <p className="line-clamp-2 border-l-2 border-[#93C5FD] pl-2 text-[#1d4ed8]">
                          {tItem.body_translated.trim()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/admin/product-collab/thread/${tItem.product_id}`}
                    className="px-2 py-1 text-xs text-[#2563EB] hover:bg-[#EFF6FF] rounded"
                  >
                    {t('productCollab.viewThread')}
                  </Link>
                  {!tItem.completed_at && (
                    <button
                      type="button"
                      disabled={completingTaskId === tItem.task_id}
                      onClick={async () => {
                        setCompletingTaskId(tItem.task_id);
                        const res = await completeTask(tItem.product_id, tItem.task_id);
                        setCompletingTaskId(null);
                        if (res.success) loadDashboard();
                      }}
                      className="px-2 py-1 text-xs text-white bg-[#10B981] hover:bg-[#059669] rounded disabled:opacity-50"
                    >
                      {t('productCollab.statusDone')}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[#6B7280] text-sm">{t('productCollab.noAssignedTasks')}</p>
        )}
        </div>
      </section>

      {/* 내 메시지 확인됨 - 초록 계열 */}
      <section className="rounded-xl border-2 border-[#A7F3D0] overflow-hidden bg-[#ECFDF5]">
        <div className="px-4 py-3 bg-[#D1FAE5] border-b border-[#A7F3D0]">
          <h2 className="text-lg font-semibold text-[#047857]">{t('productCollab.confirmationsReceivedSection')}</h2>
        </div>
        <div className="p-4 bg-white">
        <p className="text-xs text-[#6B7280] mb-3">
          {t('productCollab.confirmationsReceivedDesc')}
        </p>
        {data?.confirmationsReceived?.length ? (
          <ul className="space-y-2 text-sm text-[#1F2937]">
            {data.confirmationsReceived.map((c) => (
              <li
                key={c.task_id}
                className="flex items-center justify-between gap-3 py-2 border-b border-[#F3F4F6] last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      to={`/admin/product-collab/thread/${c.product_id}`}
                      className="text-[#2563EB] hover:underline font-medium"
                    >
                      {c.product_name}
                    </Link>
                    <span className="text-[#059669] text-xs font-medium">
                      {t('productCollab.confirmationBy').replace('{name}', c.assignee_name ?? c.assignee_id)}
                    </span>
                  </div>
                  {(c.body?.trim() || c.body_translated?.trim()) && (
                    <div className="text-sm text-[#374151] mt-1 space-y-0.5">
                      {c.body?.trim() && (
                        <p className="line-clamp-2">{c.body.trim()}</p>
                      )}
                      {c.body_translated?.trim() && (
                        <p className="line-clamp-2 border-l-2 border-[#93C5FD] pl-2 text-[#1d4ed8]">
                          {c.body_translated.trim()}
                        </p>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    {new Date(c.completed_at).toLocaleString('ko-KR')}
                  </p>
                </div>
                <Link
                  to={`/admin/product-collab/thread/${c.product_id}`}
                  className="px-2 py-1 text-xs text-[#2563EB] hover:bg-[#EFF6FF] rounded shrink-0"
                >
                  {t('productCollab.viewThread')}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[#6B7280] text-sm">{t('productCollab.noConfirmationsReceived')}</p>
        )}
        </div>
      </section>

      {/* 내 글에 달린 답글 - 주황/앰버 계열 */}
      <section className="rounded-xl border-2 border-[#FCD34D] overflow-hidden bg-[#FFFBEB]">
        <div className="px-4 py-3 bg-[#FEF3C7] border-b border-[#FCD34D]">
          <h2 className="text-lg font-semibold text-[#B45309]">{t('productCollab.repliesToMyMessagesSection')}</h2>
        </div>
        <div className="p-4 bg-white">
        <p className="text-xs text-[#6B7280] mb-3">
          {t('productCollab.repliesToMyMessagesDesc')}
        </p>
        {data?.repliesToMyMessages?.length ? (
          <ul className="space-y-2 text-sm text-[#1F2937]">
            {(data.repliesToMyMessages ?? []).map((reply) => (
              <li
                key={reply.message_id}
                className="flex items-center justify-between gap-3 py-2 border-b border-[#F3F4F6] last:border-0"
              >
                <div
                  className="min-w-0 flex-1"
                  style={reply.depth > 1 ? { paddingLeft: Math.min(reply.depth - 1, 5) * 12 } : undefined}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      to={`/admin/product-collab/thread/${reply.product_id}`}
                      className="text-[#2563EB] hover:underline font-medium"
                    >
                      {reply.product_name}
                    </Link>
                    <span className="text-[#6B7280] text-xs">
                      {reply.author_name ?? reply.author_id} · {new Date(reply.created_at).toLocaleString('ko-KR')}
                    </span>
                  </div>
                  {(reply.body?.trim() || reply.body_translated?.trim()) && (
                    <div className="text-sm text-[#374151] mt-1 space-y-0.5">
                      {reply.body?.trim() && (
                        <p className="line-clamp-2">{reply.body.trim()}</p>
                      )}
                      {reply.body_translated?.trim() && (
                        <p className="line-clamp-2 border-l-2 border-[#93C5FD] pl-2 text-[#1d4ed8]">
                          {reply.body_translated.trim()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <Link
                  to={`/admin/product-collab/thread/${reply.product_id}`}
                  className="px-2 py-1 text-xs text-[#2563EB] hover:bg-[#EFF6FF] rounded shrink-0"
                >
                  {t('productCollab.viewThread')}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[#6B7280] text-sm">{t('productCollab.noRepliesToMyMessages')}</p>
        )}
        </div>
      </section>

      {/* 담당자별 업무 - 인디고/보라 계열 */}
      <section className="rounded-xl border-2 border-[#C7D2FE] overflow-hidden bg-[#EEF2FF]">
        <div className="px-4 py-3 bg-[#E0E7FF] border-b border-[#C7D2FE]">
          <h2 className="text-lg font-semibold text-[#4338CA]">{t('productCollab.allAssigneeTasksSection')}</h2>
        </div>
        <div className="p-4 bg-white">
        {data?.allAssigneeTasks?.length ? (
          <ul className="space-y-2 text-sm text-[#1F2937]">
            {data.allAssigneeTasks.map((tItem) => (
              <li
                key={tItem.task_id}
                className="flex items-center justify-between gap-3 py-2 border-b border-[#F3F4F6] last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-semibold text-[#1D4ED8] bg-[#EFF6FF] shrink-0 min-w-[5rem]">
                      {tItem.assignee_name ?? tItem.assignee_id}
                    </span>
                    <Link
                      to={`/admin/product-collab/thread/${tItem.product_id}`}
                      className="text-[#2563EB] hover:underline font-medium"
                    >
                      {tItem.product_name}
                    </Link>
                    <span className="text-[#6B7280] text-xs">
                      {tItem.completed_at ? t('productCollab.statusDone') : t('productCollab.statusInProgress')}
                    </span>
                  </div>
                  {(tItem.body?.trim() || tItem.body_translated?.trim()) && (
                    <div className="text-sm text-[#374151] mt-1 space-y-0.5 sm:ml-[5.5rem]">
                      {tItem.body?.trim() && (
                        <p className="line-clamp-2">{tItem.body.trim()}</p>
                      )}
                      {tItem.body_translated?.trim() && (
                        <p className="line-clamp-2 border-l-2 border-[#93C5FD] pl-2 text-[#1d4ed8]">
                          {tItem.body_translated.trim()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/admin/product-collab/thread/${tItem.product_id}`}
                    className="px-2 py-1 text-xs text-[#2563EB] hover:bg-[#EFF6FF] rounded"
                  >
                    {t('productCollab.viewThread')}
                  </Link>
                  {!tItem.completed_at && tItem.assignee_id === currentUserId && (
                    <button
                      type="button"
                      disabled={completingTaskId === tItem.task_id}
                      onClick={async () => {
                        setCompletingTaskId(tItem.task_id);
                        const res = await completeTask(tItem.product_id, tItem.task_id);
                        setCompletingTaskId(null);
                        if (res.success) loadDashboard();
                      }}
                      className="px-2 py-1 text-xs text-white bg-[#10B981] hover:bg-[#059669] rounded disabled:opacity-50"
                    >
                      {t('productCollab.statusDone')}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[#6B7280] text-sm">{t('productCollab.noAllAssigneeTasks')}</p>
        )}
        </div>
      </section>

      {/* 제품 상태 - 슬레이트 계열 */}
      <section className="rounded-xl border-2 border-[#CBD5E1] overflow-hidden bg-[#F8FAFC]">
        <div className="px-4 py-3 bg-[#E2E8F0] border-b border-[#CBD5E1]">
          <h2 className="text-lg font-semibold text-[#334155]">{t('productCollab.productStatusSection')}</h2>
        </div>
        <div className="p-4 bg-white">
        <div className="flex flex-wrap gap-4 text-sm">
          {data?.statusCounts?.map((s) => (
            <span key={s.status} className="text-[#1F2937]">
              {t(PRODUCT_COLLAB_STATUS_LABEL_KEYS[s.status as keyof typeof PRODUCT_COLLAB_STATUS_LABEL_KEYS] ?? s.status)}: {s.count}
            </span>
          ))}
          {!data?.statusCounts?.length && (
            <p className="text-[#6B7280]">{t('productCollab.noProductsByStage')}</p>
          )}
        </div>
        </div>
      </section>
    </div>
  );
}
