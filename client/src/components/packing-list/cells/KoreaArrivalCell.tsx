import { useState, useEffect, useRef } from 'react';
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
  const source = item.koreaArrivalDate || [];
  const [localRows, setLocalRows] = useState<Array<{ date: string; quantity: string }>>(
    () => source.map((r) => ({ date: r.date ?? '', quantity: r.quantity ?? '' }))
  );
  const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);
  const itemIdRef = useRef(item.id);

  // 다른 행으로 바뀐 경우에만 prop으로 로컬 동기화 (blur 시 이전 prop으로 덮어쓰는 것 방지)
  useEffect(() => {
    if (itemIdRef.current !== item.id) {
      itemIdRef.current = item.id;
      setLocalRows((item.koreaArrivalDate || []).map((r) => ({ date: r.date ?? '', quantity: r.quantity ?? '' })));
    }
  }, [item.id, item.koreaArrivalDate]);

  const flushRow = (dateIndex: number) => {
    setFocusedRowIndex(null);
    const base = source.map((r) => ({ ...r }));
    const local = localRows[dateIndex];
    if (!local) return;
    const current = base[dateIndex];
    if (!current || current.date !== local.date || current.quantity !== local.quantity) {
      base[dateIndex] = { ...(base[dateIndex] || {}), date: local.date, quantity: local.quantity };
      onKoreaArrivalChange(item.id, base);
    }
  };

  const handleDateChange = (dateIndex: number, date: string) => {
    setLocalRows((prev) => {
      const next = [...prev];
      if (!next[dateIndex]) next[dateIndex] = { date: '', quantity: '' };
      next[dateIndex] = { ...next[dateIndex], date };
      return next;
    });
  };

  const handleQuantityChange = (dateIndex: number, quantity: string) => {
    setLocalRows((prev) => {
      const next = [...prev];
      if (!next[dateIndex]) next[dateIndex] = { date: '', quantity: '' };
      next[dateIndex] = { ...next[dateIndex], quantity };
      return next;
    });
  };

  const handleDelete = (dateIndex: number) => {
    const newDates = source.filter((_, idx) => idx !== dateIndex);
    onKoreaArrivalChange(item.id, newDates);
  };

  const handleAdd = () => {
    const newDates = [...source, { date: '', quantity: '' }];
    onKoreaArrivalChange(item.id, newDates);
  };

  return (
    <div className="flex flex-col gap-1 min-w-[180px]">
      {source.length > 0 ? (
        source.map((_koreaArrival, dateIndex) => (
          <div key={dateIndex} className="flex items-center gap-1">
            <input
              type="date"
              value={localRows[dateIndex]?.date ?? source[dateIndex]?.date ?? ''}
              onChange={(e) => handleDateChange(dateIndex, e.target.value)}
              onFocus={() => setFocusedRowIndex(dateIndex)}
              onBlur={() => flushRow(dateIndex)}
              className="flex-1 min-w-[120px] px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm text-center"
            />
            <input
              type="text"
              value={localRows[dateIndex]?.quantity ?? source[dateIndex]?.quantity ?? ''}
              onChange={(e) => handleQuantityChange(dateIndex, e.target.value)}
              onFocus={() => setFocusedRowIndex(dateIndex)}
              onBlur={() => flushRow(dateIndex)}
              className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm text-center"
              placeholder="수량"
            />
            <button
              type="button"
              onClick={() => handleDelete(dateIndex)}
              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors flex-shrink-0"
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
        className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded border border-purple-300 transition-colors flex items-center justify-center flex-shrink-0"
        title="추가"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
