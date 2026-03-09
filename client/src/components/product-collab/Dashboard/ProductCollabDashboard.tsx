import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard, completeTask } from '../../../api/productCollabApi';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { DashboardData } from '../types';

export function ProductCollabDashboard() {
  const { t } = useLanguage();
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
      <h1 className="text-lg font-semibold text-[#1F2937]">{t('productCollab.dashboard')}</h1>

      <section className="bg-white rounded-lg border border-[#E5E7EB] p-4">
        <h2 className="text-sm font-medium text-[#1F2937] mb-3">{t('productCollab.myTasksSection')}</h2>
        <p className="text-xs text-[#6B7280] mb-2">{t('productCollab.mentionDesc')}</p>
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
                    <p className="text-sm text-[#374151] mt-1 line-clamp-2">
                      {tItem.body?.trim() || tItem.body_translated?.trim()}
                    </p>
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
      </section>

      <section className="bg-white rounded-lg border border-[#E5E7EB] p-4">
        <h2 className="text-sm font-medium text-[#1F2937] mb-3">{t('productCollab.teamTasksSection')}</h2>
        {data?.teamTasks?.length ? (
          <ul className="space-y-2 text-sm text-[#1F2937]">
            {data.teamTasks.map((tItem) => (
              <li key={tItem.product_id} className="flex items-center justify-between gap-3 py-2 border-b border-[#F3F4F6] last:border-0">
                <span>{tItem.product_name} — {tItem.assignee_name ?? tItem.assignee_id}</span>
                <Link
                  to={`/admin/product-collab/thread/${tItem.product_id}`}
                  className="px-2 py-1 text-xs text-[#2563EB] hover:bg-[#EFF6FF] rounded shrink-0"
                >
                  {t('productCollab.viewThread')}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[#6B7280] text-sm">{t('productCollab.noTeamTasks')}</p>
        )}
      </section>

      <section className="bg-white rounded-lg border border-[#E5E7EB] p-4">
        <h2 className="text-sm font-medium text-[#1F2937] mb-3">{t('productCollab.allAssigneeTasksSection')}</h2>
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
                    <p className="text-sm text-[#374151] mt-1 line-clamp-2 sm:ml-[5.5rem]">
                      {tItem.body?.trim() || tItem.body_translated?.trim()}
                    </p>
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
      </section>

      <section className="bg-white rounded-lg border border-[#E5E7EB] p-4">
        <h2 className="text-sm font-medium text-[#1F2937] mb-3">{t('productCollab.productStatusSection')}</h2>
        <div className="flex flex-wrap gap-4 text-sm">
          {data?.statusCounts?.map((s) => (
            <span key={s.status} className="text-[#1F2937]">
              {s.status}: {s.count}
            </span>
          ))}
          {!data?.statusCounts?.length && (
            <p className="text-[#6B7280]">{t('productCollab.noProductsByStage')}</p>
          )}
        </div>
      </section>
    </div>
  );
}
