import type { ShopBuyerAddress, ShopBuyerListItem } from '../components/buyers/types';

export function normalizeShopBuyerCompanyName(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function findShopBuyerByCompanyName(
  companyName: string | null | undefined,
  buyers: ShopBuyerListItem[]
): ShopBuyerListItem | 'ambiguous' | null {
  const normalized = normalizeShopBuyerCompanyName(companyName);
  if (!normalized) return null;

  const matches = buyers.filter(
    (buyer) => normalizeShopBuyerCompanyName(buyer.companyName) === normalized
  );

  if (matches.length === 1) return matches[0];
  if (matches.length > 1) return 'ambiguous';
  return null;
}

export function formatShopBuyerAddressLine(addr: ShopBuyerAddress): string {
  return [addr.address, addr.recipientName, addr.phoneNumber]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' · ');
}

export function findMatchingAddressIndex(
  addresses: ShopBuyerAddress[],
  address: string,
  recipientName: string,
  phoneNumber: string
): number {
  const exact = addresses.findIndex(
    (item) =>
      item.address === address &&
      item.recipientName === recipientName &&
      item.phoneNumber === phoneNumber
  );
  if (exact >= 0) return exact;

  const byAddress = addresses.findIndex((item) => item.address === address && address.trim() !== '');
  return byAddress;
}
