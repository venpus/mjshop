import type { SweetTrackerBulkDeliveryCompletedData } from '../../api/sweetTrackerApi';

export type SweetTrackerBulkResultKind = 'completed' | 'not_complete' | 'error';

export interface SweetTrackerBulkResultRow {
  kind: SweetTrackerBulkResultKind;
  invoiceNo: string;
  itemName: string;
  receiverName: string;
  /** API level 숫자, 오류 행은 표시용 대시 */
  levelLabel: string;
  lastKind: string;
  lastWhere: string;
  lastTimeString: string;
}

const KIND_ORDER: Record<SweetTrackerBulkResultKind, number> = {
  completed: 0,
  not_complete: 1,
  error: 2,
};

export function buildSweetTrackerBulkResultRows(
  data: SweetTrackerBulkDeliveryCompletedData
): SweetTrackerBulkResultRow[] {
  const rows: SweetTrackerBulkResultRow[] = [];

  for (const r of data.completed) {
    rows.push({
      kind: 'completed',
      invoiceNo: r.invoiceNo,
      itemName: r.itemName,
      receiverName: r.receiverName,
      levelLabel: r.level != null ? String(r.level) : '',
      lastKind: r.lastKind,
      lastWhere: r.lastWhere,
      lastTimeString: r.lastTimeString,
    });
  }

  for (const r of data.notComplete) {
    rows.push({
      kind: 'not_complete',
      invoiceNo: r.invoiceNo,
      itemName: r.itemName,
      receiverName: r.receiverName,
      levelLabel: r.level != null ? String(r.level) : '',
      lastKind: r.lastKind,
      lastWhere: r.lastWhere,
      lastTimeString: r.lastTimeString,
    });
  }

  for (const e of data.errors) {
    rows.push({
      kind: 'error',
      invoiceNo: e.invoice,
      itemName: '',
      receiverName: '',
      levelLabel: '—',
      lastKind: e.message,
      lastWhere: '',
      lastTimeString: '—',
    });
  }

  rows.sort((a, b) => {
    const d = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    if (d !== 0) return d;
    return a.invoiceNo.localeCompare(b.invoiceNo, 'ko');
  });

  return rows;
}
