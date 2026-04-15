import type { SweetTrackerBulkDeliveryCompletedData } from '../../api/sweetTrackerApi';

function normInv(s: string): string {
  return s.trim();
}

/**
 * 대량 조회 결과에서 지정 운송장을 제거한 뒤, 새 조회 결과를 합칩니다(개별 재조회용).
 */
export function mergeBulkResultForInvoices(
  prev: SweetTrackerBulkDeliveryCompletedData,
  invoiceNos: string[],
  patch: SweetTrackerBulkDeliveryCompletedData
): SweetTrackerBulkDeliveryCompletedData {
  const remove = new Set(invoiceNos.map(normInv));

  const completed = [
    ...prev.completed.filter((r) => !remove.has(normInv(r.invoiceNo))),
    ...patch.completed,
  ].sort((a, b) => a.invoiceNo.localeCompare(b.invoiceNo, 'ko'));

  const notComplete = [
    ...prev.notComplete.filter((r) => !remove.has(normInv(r.invoiceNo))),
    ...patch.notComplete,
  ].sort((a, b) => a.invoiceNo.localeCompare(b.invoiceNo, 'ko'));

  const errors = [
    ...prev.errors.filter((e) => !remove.has(normInv(e.invoice))),
    ...patch.errors,
  ];

  return { completed, notComplete, errors };
}
