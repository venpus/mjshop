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

export function formatCompanyNameWithKakaoId(
  companyName: string | null | undefined,
  kakaoId?: string | null
): string {
  const name = (companyName ?? '').trim();
  const kakao = (kakaoId ?? '').trim();
  if (!name && !kakao) return '';
  if (!name) return kakao;
  if (!kakao) return name;
  return `${name} (${kakao})`;
}

export function resolveCompanyNameDisplay(
  companyName: string | null | undefined,
  buyers: ShopBuyerListItem[]
): string {
  const name = (companyName ?? '').trim();
  if (!name) return '-';

  const match = findShopBuyerByCompanyName(name, buyers);
  if (match && match !== 'ambiguous') {
    return formatCompanyNameWithKakaoId(name, match.kakaoId);
  }

  return name;
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
