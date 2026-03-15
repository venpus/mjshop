import type { OrderStatusKey, PaymentStatusKey } from '../components/ui/status-badge';

/** API/한국어 발주 상태 → 배지 색상용 키 */
export function getOrderStatusKey(
  orderStatus: string
): OrderStatusKey {
  if (orderStatus === '발주확인') return 'confirmed';
  if (orderStatus === '취소됨') return 'cancelled';
  return 'pending';
}

/**
 * 발주 결제 정보 → 배지 색상용 키
 * 선금/잔금 없으면 paymentStatus 문자열로 판단
 */
export function getPaymentStatusKey(
  paymentStatus: string,
  advancePaymentDate?: string | null,
  balancePaymentDate?: string | null
): PaymentStatusKey {
  if (advancePaymentDate && balancePaymentDate) return 'complete';
  if (advancePaymentDate) return 'advance';
  if (paymentStatus === '선금결제') return 'advance';
  if (paymentStatus === '완료') return 'complete';
  return 'unpaid';
}
