import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard, completeTask } from '../../../api/productCollabApi';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useProductCollabCounts } from '../ProductCollabCountsContext';
import { getDashboardShowBothLanguages } from '../../../constants/settings';
import { useIsMobile } from '../../ui/use-mobile';
import type { DashboardData } from '../types';
import { PRODUCT_COLLAB_STATUS_LABEL_KEYS, PRODUCT_COLLAB_STATUS_BADGE_CLASS } from '../types';

export function ProductCollabDashboard() {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();
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

  /** 제품 현황 표시 순서: 문제발생(ISSUE_OCCURRED) 항상 맨 앞 (훅은 조건부 return 이전에 호출) */
  const sortedStatusCounts = useMemo(() => {
    const list = data?.statusCounts ?? [];
    const issue = list.find((s) => s.status === 'ISSUE_OCCURRED');
    const rest = list.filter((s) => s.status !== 'ISSUE_OCCURRED');
    return issue ? [issue, ...rest] : list;
  }, [data?.statusCounts]);

  if (loading) return <div className="p-6 text-[#1F2937]">{t('productCollab.loading')}</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  const showBothLanguages = getDashboardShowBothLanguages();

  /** 모바일 3개, 웹 4개 */
  const dashboardListLimit = isMobile ? 3 : 4;

  /** 시스템 언어에 맞는 본문만 반환 (한국어면 원문이 한이면 원문, 원문이 중이면 번역문) */
  const bodyForLanguage = (item: { body?: string | null; body_translated?: string | null; body_lang?: string | null }) => {
    const body = item.body ?? '';
    const translated = item.body_translated?.trim() || null;
    const bodyLang = item.body_lang ?? null;
    if (bodyLang == null) return body;
    if (language === bodyLang) return body;
    return translated || body;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-[#1F2937]">
        {t('productCollab.dashboard')}
        {counts && (
          <span className="ml-2 text-base font-semibold text-[#6B7280]">({counts.activeCount})</span>
        )}
      </h1>

      {/* 제품 현황 - 슬레이트 계열 (맨 위로 이동), 클릭 시 해당 상태 목록으로 이동 */}
      <section className="rounded-xl border-2 border-[#CBD5E1] overflow-hidden bg-[#F8FAFC]">
        <div className="px-4 py-3 bg-[#E2E8F0] border-b border-[#CBD5E1]">
          <h2 className="text-lg font-semibold text-[#334155]">{t('productCollab.productStatusSection')}</h2>
        </div>
        <div className="p-4 bg-white">
        <div className="flex flex-wrap gap-3 text-sm">
          {sortedStatusCounts.map((s) => {
            const statusKey = s.status as keyof typeof PRODUCT_COLLAB_STATUS_BADGE_CLASS;
            const badgeClass = PRODUCT_COLLAB_STATUS_BADGE_CLASS[statusKey] ?? 'bg-[#E2E8F0] text-[#475569] border-[#CBD5E1]';
            return (
            <Link
              key={s.status}
              to={`/admin/product-collab/list?status=${encodeURIComponent(s.status)}`}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border ${badgeClass} hover:opacity-90 transition-opacity`}
            >
              <span>{t(PRODUCT_COLLAB_STATUS_LABEL_KEYS[statusKey] ?? s.status)}</span>
              <span className="font-semibold tabular-nums opacity-90">({s.count})</span>
            </Link>
            );
          })}
          {!sortedStatusCounts.length && (
            <p className="text-[#6B7280]">{t('productCollab.noProductsByStage')}</p>
          )}
        </div>
        </div>
      </section>

      {/* 내 업무 - 파란 계열 */}
      <section className="rounded-xl border-2 border-[#BFDBFE] overflow-hidden bg-[#EFF6FF]">
        <div className="px-4 py-3 bg-[#DBEAFE] border-b border-[#BFDBFE] flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-[#1E40AF]">{t('productCollab.myTasksSection')}</h2>
          <Link
            to="/admin/product-collab/dashboard/more/my-tasks"
            className="text-base font-bold text-[#1E40AF] hover:underline underline-offset-2 shrink-0"
          >
            {t('productCollab.seeMore')} ({(data?.myTasksTotal ?? data?.myTasks?.length) ?? 0})
          </Link>
        </div>
        <div className="p-4 bg-white">
        <p className="text-xs text-[#6B7280] mb-3">{t('productCollab.mentionDesc')}</p>
        {data?.myTasks?.length ? (
          <div>
            <ul className="space-y-2 text-sm text-[#1F2937]">
            {data.myTasks.map((tItem) => (
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
                  {(showBothLanguages
                    ? (tItem.body?.trim() || tItem.body_translated?.trim())
                    : bodyForLanguage(tItem).trim()) && (
                    <div className="text-sm text-[#374151] mt-1">
                      {showBothLanguages ? (
                        <>
                          {tItem.body?.trim() && <p className="line-clamp-2">{tItem.body.trim()}</p>}
                          {tItem.body_translated?.trim() && (
                            <p className="line-clamp-2 border-l-2 border-[#E5E7EB] pl-2 text-[#6B7280] mt-0.5">
                              {tItem.body_translated.trim()}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="line-clamp-2">{bodyForLanguage(tItem).trim()}</p>
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
                        const taskId = tItem.task_id;
                        const productId = tItem.product_id;
                        setCompletingTaskId(taskId);
                        setData((prev) =>
                          prev
                            ? {
                                ...prev,
                                myTasks: prev.myTasks.filter((t) => t.task_id !== taskId),
                                confirmationsReceived: prev.confirmationsReceived?.filter((c) => c.task_id !== taskId) ?? prev.confirmationsReceived,
                              }
                            : null
                        );
                        const res = await completeTask(productId, taskId);
                        setCompletingTaskId(null);
                        if (!res.success) loadDashboard();
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
          </div>
        ) : (
          <p className="text-[#6B7280] text-sm">{t('productCollab.noAssignedTasks')}</p>
        )}
        </div>
      </section>

      {/* 내 메시지 확인됨 - 초록 계열 */}
      <section className="rounded-xl border-2 border-[#A7F3D0] overflow-hidden bg-[#ECFDF5]">
        <div className="px-4 py-3 bg-[#D1FAE5] border-b border-[#A7F3D0] flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-[#047857]">{t('productCollab.confirmationsReceivedSection')}</h2>
          <Link
            to="/admin/product-collab/dashboard/more/confirmations"
            className="text-base font-bold text-[#047857] hover:underline underline-offset-2 shrink-0"
          >
            {t('productCollab.seeMore')} ({(data?.confirmationsReceivedTotal ?? data?.confirmationsReceived?.length) ?? 0})
          </Link>
        </div>
        <div className="p-4 bg-white">
        <p className="text-xs text-[#6B7280] mb-3">
          {t('productCollab.confirmationsReceivedDesc')}
        </p>
        {data?.confirmationsReceived?.length ? (
          <div>
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
                  {(showBothLanguages
                    ? (c.body?.trim() || c.body_translated?.trim())
                    : bodyForLanguage(c).trim()) && (
                    <div className="text-sm text-[#374151] mt-1">
                      {showBothLanguages ? (
                        <>
                          {c.body?.trim() && <p className="line-clamp-2">{c.body.trim()}</p>}
                          {c.body_translated?.trim() && (
                            <p className="line-clamp-2 border-l-2 border-[#E5E7EB] pl-2 text-[#6B7280] mt-0.5">
                              {c.body_translated.trim()}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="line-clamp-2">{bodyForLanguage(c).trim()}</p>
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
          </div>
        ) : (
          <p className="text-[#6B7280] text-sm">{t('productCollab.noConfirmationsReceived')}</p>
        )}
        </div>
      </section>

      {/* 내 글에 달린 답글 - 주황/앰버 계열 */}
      <section className="rounded-xl border-2 border-[#FCD34D] overflow-hidden bg-[#FFFBEB]">
        <div className="px-4 py-3 bg-[#FEF3C7] border-b border-[#FCD34D] flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-[#B45309]">{t('productCollab.repliesToMyMessagesSection')}</h2>
          <Link
            to="/admin/product-collab/dashboard/more/replies"
            className="text-base font-bold text-[#B45309] hover:underline underline-offset-2 shrink-0"
          >
            {t('productCollab.seeMore')} ({(data?.repliesToMyMessagesTotal ?? data?.repliesToMyMessages?.length) ?? 0})
          </Link>
        </div>
        <div className="p-4 bg-white">
        <p className="text-xs text-[#6B7280] mb-3">
          {t('productCollab.repliesToMyMessagesDesc')}
        </p>
        {data?.repliesToMyMessages?.length ? (
          <div>
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
                  {(bodyForLanguage(reply).trim()) && (
                    <div className="text-sm text-[#374151] mt-1">
                      <p className="line-clamp-2">{bodyForLanguage(reply).trim()}</p>
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
          </div>
        ) : (
          <p className="text-[#6B7280] text-sm">{t('productCollab.noRepliesToMyMessages')}</p>
        )}
        </div>
      </section>

      {/* 담당자별 업무 - 인디고/보라 계열 */}
      <section className="rounded-xl border-2 border-[#C7D2FE] overflow-hidden bg-[#EEF2FF]">
        <div className="px-4 py-3 bg-[#E0E7FF] border-b border-[#C7D2FE] flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-[#4338CA]">{t('productCollab.allAssigneeTasksSection')}</h2>
          <Link
            to="/admin/product-collab/dashboard/more/assignee-tasks"
            className="text-base font-bold text-[#4338CA] hover:underline underline-offset-2 shrink-0"
          >
            {t('productCollab.seeMore')} ({(data?.allAssigneeTasksTotal ?? data?.allAssigneeTasks?.length) ?? 0})
          </Link>
        </div>
        <div className="p-4 bg-white">
        {data?.allAssigneeTasks?.length ? (
          <div>
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
                  {(showBothLanguages
                    ? (tItem.body?.trim() || tItem.body_translated?.trim())
                    : bodyForLanguage(tItem).trim()) && (
                    <div className="text-sm text-[#374151] mt-1 space-y-0.5 sm:ml-[5.5rem]">
                      {showBothLanguages ? (
                        <>
                          {tItem.body?.trim() && <p className="line-clamp-2">{tItem.body.trim()}</p>}
                          {tItem.body_translated?.trim() && (
                            <p className="line-clamp-2 border-l-2 border-[#E5E7EB] pl-2 text-[#6B7280] mt-0.5">
                              {tItem.body_translated.trim()}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="line-clamp-2">{bodyForLanguage(tItem).trim()}</p>
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
                        const taskId = tItem.task_id;
                        const productId = tItem.product_id;
                        setCompletingTaskId(taskId);
                        setData((prev) =>
                          prev
                            ? {
                                ...prev,
                                allAssigneeTasks: prev.allAssigneeTasks.filter((t) => t.task_id !== taskId),
                                confirmationsReceived: prev.confirmationsReceived?.filter((c) => c.task_id !== taskId) ?? prev.confirmationsReceived,
                              }
                            : null
                        );
                        const res = await completeTask(productId, taskId);
                        setCompletingTaskId(null);
                        if (!res.success) loadDashboard();
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
          </div>
        ) : (
          <p className="text-[#6B7280] text-sm">{t('productCollab.noAllAssigneeTasks')}</p>
        )}
        </div>
      </section>
    </div>
  );
}
