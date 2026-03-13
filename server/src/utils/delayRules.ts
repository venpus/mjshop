/**
 * 업무 지연 판단 규칙
 * 기준: 마지막 스레드 작성일(last_activity_at) + 상태별 허용 일수
 */
import type { ProductCollabStatus } from '../models/productCollab.js';

export const DELAY_DAYS_BY_STATUS: Partial<Record<ProductCollabStatus, number>> = {
  RESEARCH: 2,
  SAMPLE_TEST: 4,
  CONFIG_CONFIRM: 2,
  ORDER_PENDING: 2,
  ISSUE_OCCURRED: 2,
};

export interface DelayInfo {
  isDelayed: boolean;
  daysOverdue?: number;
}

/**
 * 제품 상태와 마지막 스레드 작성일 기준으로 지연 여부 계산
 */
export function getDelayInfo(
  status: string | null,
  lastMessageAt: Date | string | null
): DelayInfo {
  const allowedDays = status ? DELAY_DAYS_BY_STATUS[status as ProductCollabStatus] : undefined;
  if (allowedDays == null) return { isDelayed: false };
  if (!lastMessageAt) return { isDelayed: false };

  const last = typeof lastMessageAt === 'string' ? new Date(lastMessageAt) : lastMessageAt;
  const deadline = new Date(last);
  deadline.setDate(deadline.getDate() + allowedDays);
  const now = new Date();
  if (now <= deadline) return { isDelayed: false };

  const diffMs = now.getTime() - deadline.getTime();
  const daysOverdue = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  return { isDelayed: true, daysOverdue };
}
