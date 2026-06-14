import type { InventoryListItem } from './types';
import { InventoryCard } from './InventoryCard';

interface InventoryCardGridProps {
  items: InventoryListItem[];
  onCardClick?: (item: InventoryListItem) => void;
}

export function InventoryCardGrid({ items, onCardClick }: InventoryCardGridProps) {
  if (items.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500">
        입고된 제품이 없습니다.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-4">
      {items.map((item) => (
        <InventoryCard key={item.id} item={item} onCardClick={onCardClick} />
      ))}
    </div>
  );
}
