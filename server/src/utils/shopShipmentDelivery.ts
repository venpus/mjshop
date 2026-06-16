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

export function assertSameDeliveryTargets(
  items: Array<{ recipientName?: string | null; address?: string | null }>
): void {
  if (items.length <= 1) return;

  const first = items[0];
  for (let index = 1; index < items.length; index += 1) {
    if (!isSameDeliveryTarget(first, items[index])) {
      throw new Error(
        '같은 송장에 포함할 주문건은 수령인과 주소가 동일해야 합니다.'
      );
    }
  }
}
