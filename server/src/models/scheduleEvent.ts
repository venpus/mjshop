export type ScheduleEventKind =
  | 'production'
  | 'shipment'
  | 'other'
  | 'logistics_dispatch'
  | 'korea_arrival_expected';

export interface ScheduleEventRow {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  kind: ScheduleEventKind;
  note: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ScheduleEventDTO {
  id: string;
  title: string;
  startDateKey: string;
  endDateKey: string;
  kind: ScheduleEventKind;
  note?: string | null;
  purchaseOrderId?: string | null;
  /** JOIN purchase_orders (표시용) */
  poNumber?: string | null;
  productName?: string | null;
  /** 물류발송–한국도착예정 짝 */
  pairId?: string | null;
  /** 물류발송 배송 소요일(달력일) */
  transitDays?: number | null;
  /** 같은 pair의 상대 일정 id */
  pairedEventId?: string | null;
}
