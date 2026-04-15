import type { NotArrivedItem, NotArrivedSummary } from '../api/purchaseOrderApi';

/** 선택된(또는 임의의) 미도착 행 목록으로 요약 수치 계산 — 엑셀보내기 등에 사용 */
export function summarizeNotArrivedItems(items: NotArrivedItem[]): NotArrivedSummary {
  return items.reduce<NotArrivedSummary>(
    (acc, item) => {
      const unit = item.order_unit_price ?? item.unit_price;
      acc.total_quantity += item.quantity;
      acc.total_amount += item.total_amount;
      acc.not_arrived_quantity += item.not_arrived_quantity;
      acc.not_arrived_amount += unit * item.not_arrived_quantity;
      return acc;
    },
    { total_quantity: 0, total_amount: 0, not_arrived_quantity: 0, not_arrived_amount: 0 }
  );
}
