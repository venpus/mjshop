export type ScheduleEventKind = "production" | "shipment" | "other";

export interface ScheduleEvent {
  id: string;
  title: string;
  /** YYYY-MM-DD (로컬, 포함) */
  startDateKey: string;
  /** YYYY-MM-DD (로컬, 포함), 시작일과 같을 수 있음 */
  endDateKey: string;
  kind: ScheduleEventKind;
  note?: string;
  /** 발주관리 연결 (생산중/출고예정) */
  purchaseOrderId?: string;
  poNumber?: string;
  productName?: string;
}

export type ScheduleFiltersState = Record<ScheduleEventKind, boolean>;

export const DEFAULT_SCHEDULE_FILTERS: ScheduleFiltersState = {
  production: true,
  shipment: true,
  other: true,
};
