import type { ShopBuyerAddress } from './types';

interface BuyerAddressListDisplayProps {
  addresses: ShopBuyerAddress[];
}

function formatAddressLine(addr: ShopBuyerAddress): string {
  return [addr.address, addr.recipientName, addr.phoneNumber]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' · ');
}

export function BuyerAddressListDisplay({ addresses }: BuyerAddressListDisplayProps) {
  if (addresses.length === 0) {
    return <span className="text-gray-400 text-sm">-</span>;
  }

  return (
    <div className="space-y-1.5 min-w-[280px]">
      {addresses.map((addr, index) => {
        const line = formatAddressLine(addr);
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
