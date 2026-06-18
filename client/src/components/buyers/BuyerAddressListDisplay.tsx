import type { ShopBuyerAddress } from './types';

interface BuyerAddressListDisplayProps {
  addresses: ShopBuyerAddress[];
  includePhone?: boolean;
}

function formatAddressLine(addr: ShopBuyerAddress, includePhone: boolean): string {
  const parts = includePhone
    ? [addr.address, addr.recipientName, addr.phoneNumber]
    : [addr.address, addr.recipientName];
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' · ');
}

export function BuyerAddressListDisplay({
  addresses,
  includePhone = true,
}: BuyerAddressListDisplayProps) {
  if (addresses.length === 0) {
    return <span className="text-gray-400 text-sm">-</span>;
  }

  return (
    <div className="space-y-1.5 min-w-[280px]">
      {addresses.map((addr, index) => {
        const line = formatAddressLine(addr, includePhone);
        return (
          <div
            key={addr.id ?? `addr-${index}`}
            className="text-sm text-gray-900 whitespace-normal break-words"
          >
            {line || '-'}
          </div>
        );
      })}
    </div>
  );
}
