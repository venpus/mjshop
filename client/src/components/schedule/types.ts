export type ScheduleEventKind =
  | "production"
  | "shipment"
  | "other"
  | "logistics_dispatch"
  | "korea_arrival_expected";

export interface ScheduleEvent {
  id: string;
  title: string;
  /** YYYY-MM-DD (로컬, 포함) */
  startDateKey: string;
  /** YYYY-MM-DD (로컬, 포함), 시작일과 같을 수 있음 */
  endDateKey: string;
  kind: ScheduleEventKind;
  note?: string;
  /** 발주관리 연결 (생산중/출고예정/물류발송/한국도착예정) */
  purchaseOrderId?: string;
  poNumber?: string;
  productName?: string;
  /** 물류발송–한국도착예정 짝 */
  pairId?: string;
  /** 물류발송 배송 소요일(달력일) */
  transitDays?: number;
  /** 짝 일정 id (편집 시 물류발송으로 열기) */
  pairedEventId?: string;
}

/** `all`: 유형 칩은 비활성 UI, 달력에는 전 유형 표시. `kinds`: 켜진 유형만 표시(다중 선택). */
export type ScheduleFilterMode = "all" | "kinds";

export type ScheduleFiltersState = {
  mode: ScheduleFilterMode;
  kinds: Record<ScheduleEventKind, boolean>;
};

export const KINDS_ALL_TRUE: Record<ScheduleEventKind, boolean> = {
  production: true,
  shipment: true,
  other: true,
  logistics_dispatch: true,
  korea_arrival_expected: true,
};

export const KINDS_ALL_FALSE: Record<ScheduleEventKind, boolean> = {
  production: false,
  shipment: false,
  other: false,
  logistics_dispatch: false,
  korea_arrival_expected: false,
};

export const DEFAULT_SCHEDULE_FILTERS: ScheduleFiltersState = {
  mode: "all",
  kinds: { ...KINDS_ALL_TRUE },
};
