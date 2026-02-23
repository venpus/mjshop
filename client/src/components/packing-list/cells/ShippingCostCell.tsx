import { useState, useEffect, useRef } from 'react';
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
  const propValue = item.shippingCost ?? '';
  const [localValue, setLocalValue] = useState(propValue);
  const [isFocused, setIsFocused] = useState(false);
  const itemIdRef = useRef(item.id);

  // 다른 행으로 바뀐 경우에만 prop으로 로컬 동기화 (blur 시 이전 prop으로 덮어쓰는 것 방지)
  useEffect(() => {
    if (itemIdRef.current !== item.id) {
      itemIdRef.current = item.id;
      setLocalValue(item.shippingCost ?? '');
    }
  }, [item.id, item.shippingCost]);

  const handleBlur = () => {
    setIsFocused(false);
    if (localValue !== propValue) {
      onShippingCostChange(groupId, localValue);
    }
  };

  return (
    <div className="flex items-center justify-center gap-1">
      <span className="text-sm text-gray-700">¥</span>
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        className="flex-1 min-w-[80px] px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm text-center"
      />
    </div>
  );
}
