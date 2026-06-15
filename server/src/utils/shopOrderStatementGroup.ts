export interface StatementGroupLineInput {
  shopOrderId: string;
  lineId: string;
  orderNumber: string;
  companyName: string | null;
  address: string | null;
  recipientName: string | null;
  phoneNumber: string | null;
  isReservation: boolean;
}

export interface ShopBuyerLookup {
  id: number;
  companyName: string;
}

export function normalizeStatementGroupField(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function resolveBuyerIdByCompanyName(
  companyName: string | null | undefined,
  buyers: ShopBuyerLookup[]
): number | null {
  const normalized = normalizeStatementGroupField(companyName);
  if (!normalized) return null;

  const matches = buyers.filter(
    (buyer) => normalizeStatementGroupField(buyer.companyName) === normalized
  );
  return matches.length === 1 ? matches[0].id : null;
}

export function buildStatementGroupKey(
  line: Pick<
    StatementGroupLineInput,
    'companyName' | 'address' | 'recipientName' | 'phoneNumber' | 'isReservation'
  >,
  buyerId: number | null
): string {
  const buyerPart =
    buyerId != null
      ? `b:${buyerId}`
      : `c:${normalizeStatementGroupField(line.companyName)}`;

  return [
    line.isReservation ? 'r' : 'o',
    buyerPart,
    normalizeStatementGroupField(line.address),
    normalizeStatementGroupField(line.recipientName),
    normalizeStatementGroupField(line.phoneNumber),
  ].join('|');
}

export interface StatementLineGroup<T extends StatementGroupLineInput = StatementGroupLineInput> {
  groupKey: string;
  companyName: string;
  lines: T[];
}

export function groupStatementLines<T extends StatementGroupLineInput>(
  lines: T[],
  buyers: ShopBuyerLookup[]
): StatementLineGroup<T>[] {
  const groups = new Map<string, StatementLineGroup<T>>();

  for (const line of lines) {
    const buyerId = resolveBuyerIdByCompanyName(line.companyName, buyers);
    const groupKey = buildStatementGroupKey(line, buyerId);
    const existing = groups.get(groupKey);

    if (existing) {
      existing.lines.push(line);
      continue;
    }

    groups.set(groupKey, {
      groupKey,
      companyName: (line.companyName ?? '').trim() || '미상',
      lines: [line],
    });
  }

  return Array.from(groups.values());
}
