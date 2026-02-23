import { useState, useEffect, useRef } from 'react';
import { calculateWeight } from '../../../utils/packingListUtils';
import { WEIGHT_RATIOS } from '../types';
import type { PackingListItem } from '../types';

interface WeightCellProps {
  item: PackingListItem;
  groupId: string;
  isSuperAdmin: boolean;
  rowSpan?: number;
  onActualWeightChange: (groupId: string, actualWeight: string, calculatedWeight: string) => void;
  onWeightRatioChange: (groupId: string, weightRatio: '0%' | '5%' | '10%' | '15%' | '20%' | '', calculatedWeight: string) => void;
}

function filterActualWeightInput(value: string): string {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  return parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
}

export function WeightCell({
  item,
  groupId,
  isSuperAdmin,
  rowSpan,
  onActualWeightChange,
  onWeightRatioChange,
}: WeightCellProps) {
  const propActualWeight = item.actualWeight ?? '';
  const [localActualWeight, setLocalActualWeight] = useState(propActualWeight);
  const [isFocused, setIsFocused] = useState(false);
  const itemIdRef = useRef(item.id);

  // 다른 행으로 바뀐 경우에만 prop으로 로컬 동기화 (blur 시 이전 prop으로 덮어쓰는 것 방지)
  useEffect(() => {
    if (itemIdRef.current !== item.id) {
      itemIdRef.current = item.id;
      setLocalActualWeight(item.actualWeight ?? '');
    }
  }, [item.id, item.actualWeight]);

  const handleActualWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filtered = filterActualWeightInput(e.target.value);
    if (filtered.length <= 6) setLocalActualWeight(filtered);
  };

  const handleActualWeightBlur = () => {
    setIsFocused(false);
    const trimmed = localActualWeight.trim();
    const current = (item.actualWeight ?? '').trim();
    if (trimmed !== current) {
      const calculated = calculateWeight(trimmed, item.weightRatio);
      onActualWeightChange(groupId, trimmed, calculated);
    }
  };

  const handleWeightRatioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRatio = e.target.value as '0%' | '5%' | '10%' | '15%' | '20%' | '';
    const calculated = calculateWeight(item.actualWeight ?? '', newRatio);
    onWeightRatioChange(groupId, newRatio, calculated);
  };

  return (
    <>
      {/* 실중량 */}
      <td rowSpan={rowSpan} className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200 align-middle whitespace-nowrap">
        <div className="flex items-center justify-center gap-1">
          <input
            type="text"
            value={localActualWeight}
            onChange={handleActualWeightChange}
            onFocus={() => setIsFocused(true)}
            onBlur={handleActualWeightBlur}
            className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm text-center"
            placeholder="0"
            maxLength={6}
          />
          <span className="text-sm text-gray-700 whitespace-nowrap">kg</span>
        </div>
      </td>
      {/* 비율 - A 등급만 보임 */}
      {isSuperAdmin && (
        <td rowSpan={rowSpan} className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200 align-middle whitespace-nowrap">
          <select
            value={item.weightRatio || '0%'}
            onChange={handleWeightRatioChange}
            className="w-auto min-w-[50px] px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm text-center"
          >
            {WEIGHT_RATIOS.map(ratio => (
              <option key={ratio} value={ratio}>{ratio}</option>
            ))}
          </select>
        </td>
      )}
      {/* 중량 - A 등급만 보임 */}
      {isSuperAdmin && (
        <td rowSpan={rowSpan} className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200 align-middle whitespace-nowrap">
          {item.calculatedWeight ? `${item.calculatedWeight}kg` : '-'}
        </td>
      )}
    </>
  );
}
