import type { DashboardStatusCount, ProductCollabStatus } from '../types';

/** 목록·대시보드 공통 표시 순 (문제발생 우선) */
const STATUS_COUNT_ORDER: ProductCollabStatus[] = [
  'ISSUE_OCCURRED',
  'RESEARCH',
  'SAMPLE_TEST',
  'CONFIG_CONFIRM',
  'ORDER_PENDING',
  'INCOMING',
  'IN_PRODUCTION',
];

export function sortStatusCountsWithItems(counts: DashboardStatusCount[]): DashboardStatusCount[] {
  return counts
    .filter((c) => c.count > 0)
    .sort((a, b) => {
      const ia = STATUS_COUNT_ORDER.indexOf(a.status as ProductCollabStatus);
      const ib = STATUS_COUNT_ORDER.indexOf(b.status as ProductCollabStatus);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
}
