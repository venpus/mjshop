import type { ShopBuyerAddress } from '../models/shopBuyer.js';

export function normalizeShopBuyerCompanyName(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function normalizeShopBuyerContactField(value: string | null | undefined): string {
  return (value ?? '').trim();
}

export function findMatchingBuyerAddressIndex(
  addresses: ShopBuyerAddress[],
  address: string | null | undefined,
  recipientName: string | null | undefined,
  phoneNumber: string | null | undefined
): number {
  const lineAddress = normalizeShopBuyerContactField(address);
  const lineRecipient = normalizeShopBuyerContactField(recipientName);
  const linePhone = normalizeShopBuyerContactField(phoneNumber);

  const exact = addresses.findIndex(
    (item) =>
      normalizeShopBuyerContactField(item.address) === lineAddress &&
      normalizeShopBuyerContactField(item.recipientName) === lineRecipient &&
      normalizeShopBuyerContactField(item.phoneNumber) === linePhone
  );
  if (exact >= 0) return exact;

  if (!lineAddress) return -1;

  return addresses.findIndex(
    (item) => normalizeShopBuyerContactField(item.address) === lineAddress
  );
}

export interface OrderLineBuyerContactUpdate {
  companyName: string;
  address?: string | null;
  recipientName?: string | null;
  phoneNumber?: string | null;
}

export interface OrderLineBuyerContactRow {
  id: string;
  companyName: string | null;
  address: string | null;
  recipientName: string | null;
  phoneNumber: string | null;
}

export function buildOrderLineBuyerContactUpdates(
  lines: OrderLineBuyerContactRow[],
  previousCompanyName: string,
  nextCompanyName: string,
  previousAddresses: ShopBuyerAddress[],
  nextAddresses: ShopBuyerAddress[]
): Map<string, OrderLineBuyerContactUpdate> {
  const previousKey = normalizeShopBuyerCompanyName(previousCompanyName);
  const updates = new Map<string, OrderLineBuyerContactUpdate>();

  for (const line of lines) {
    if (normalizeShopBuyerCompanyName(line.companyName) !== previousKey) {
      continue;
    }

    const patch: OrderLineBuyerContactUpdate = {
      companyName: nextCompanyName.trim(),
    };

    const addressIndex = findMatchingBuyerAddressIndex(
      previousAddresses,
      line.address,
      line.recipientName,
      line.phoneNumber
    );

    if (addressIndex >= 0 && nextAddresses[addressIndex]) {
      const nextAddress = nextAddresses[addressIndex];
      patch.address = nextAddress.address.trim();
      patch.recipientName = nextAddress.recipientName.trim();
      patch.phoneNumber = nextAddress.phoneNumber.trim();
    }

    updates.set(line.id, patch);
  }

  return updates;
}
