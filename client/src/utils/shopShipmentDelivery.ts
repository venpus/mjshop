export function normalizeDeliveryField(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ');
}

export function isSameDeliveryTarget(
  a: { recipientName?: string | null; address?: string | null },
  b: { recipientName?: string | null; address?: string | null }
): boolean {
  return (
    normalizeDeliveryField(a.recipientName) === normalizeDeliveryField(b.recipientName) &&
    normalizeDeliveryField(a.address) === normalizeDeliveryField(b.address)
  );
}

export function getDeliveryMismatchMessage(
  base: { recipientName?: string | null; address?: string | null },
  next: { recipientName?: string | null; address?: string | null }
): string {
  return (
    '같은 송장에 포함할 주문건은 수령인과 주소가 동일해야 합니다.\n\n' +
    `기존: ${normalizeDeliveryField(base.recipientName) || '-'} / ${normalizeDeliveryField(base.address) || '-'}\n` +
    `선택: ${normalizeDeliveryField(next.recipientName) || '-'} / ${normalizeDeliveryField(next.address) || '-'}`
  );
}
