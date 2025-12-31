import { Plus, X } from 'lucide-react';
import type { PackingListItem } from '../types';

interface KoreaArrivalCellProps {
  item: PackingListItem;
  onKoreaArrivalChange: (itemId: string, koreaArrivalDates: Array<{ id?: number; date: string; quantity: string }>) => void;
}

export function KoreaArrivalCell({
  item,
  onKoreaArrivalChange,
}: KoreaArrivalCellProps) {
  const handleDateChange = (dateIndex: number, date: string) => {
    const newDates = [...(item.koreaArrivalDate || [])];
    newDates[dateIndex] = { ...newDates[dateIndex], date };
    onKoreaArrivalChange(item.id, newDates);
  };

  const handleQuantityChange = (dateIndex: number, quantity: string) => {
    const newDates = [...(item.koreaArrivalDate || [])];
    newDates[dateIndex] = { ...newDates[dateIndex], quantity };
    onKoreaArrivalChange(item.id, newDates);
  };

  const handleDelete = (dateIndex: number) => {
    const newDates = (item.koreaArrivalDate || []).filter((_, idx) => idx !== dateIndex);
    onKoreaArrivalChange(item.id, newDates);
  };

  const handleAdd = () => {
    const newDates = [...(item.koreaArrivalDate || []), { date: '', quantity: '' }];
    onKoreaArrivalChange(item.id, newDates);
  };

  return (
    <div className="flex flex-col gap-1">
      {item.koreaArrivalDate && item.koreaArrivalDate.length > 0 ? (
        item.koreaArrivalDate.map((koreaArrival, dateIndex) => (
          <div key={dateIndex} className="flex items-center gap-1">
            <input
              type="date"
              value={koreaArrival.date || ''}
              onChange={(e) => handleDateChange(dateIndex, e.target.value)}
              className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm text-center"
            />
            <input
              type="text"
              value={koreaArrival.quantity || ''}
              onChange={(e) => handleQuantityChange(dateIndex, e.target.value)}
              className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm text-center"
              placeholder="수량"
            />
            <button
              type="button"
              onClick={() => handleDelete(dateIndex)}
              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
              title="삭제"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))
      ) : (
        <span className="text-gray-400 text-xs">-</span>
      )}
      <button
        type="button"
        onClick={handleAdd}
        className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded border border-purple-300 transition-colors flex items-center justify-center"
        title="추가"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
