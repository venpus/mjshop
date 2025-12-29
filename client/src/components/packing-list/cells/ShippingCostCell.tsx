import type { PackingListItem } from '../types';

interface ShippingCostCellProps {
  item: PackingListItem;
  groupId: string;
  onShippingCostChange: (groupId: string, shippingCost: string) => void;
}

export function ShippingCostCell({
  item,
  groupId,
  onShippingCostChange,
}: ShippingCostCellProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onShippingCostChange(groupId, e.target.value);
  };

  return (
    <div className="flex items-center justify-center gap-1">
      <span className="text-sm text-gray-700">¥</span>
      <input
        type="text"
        value={item.shippingCost}
        onChange={handleChange}
        className="flex-1 min-w-[80px] px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm text-center"
      />
    </div>
  );
}
