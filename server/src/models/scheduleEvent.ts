export type ScheduleEventKind = 'production' | 'shipment' | 'other';

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
}
