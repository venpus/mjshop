import { calculateWeight } from '../../../utils/packingListUtils';
import { WEIGHT_RATIOS } from '../types';
import type { PackingListItem } from '../types';

interface WeightCellProps {
  item: PackingListItem;
  groupId: string;
  isSuperAdmin: boolean;
  rowSpan?: number;
  onActualWeightChange: (groupId: string, actualWeight: string, calculatedWeight: string) => void;
  onWeightRatioChange: (groupId: string, weightRatio: '5%' | '10%' | '15%' | '20%' | '', calculatedWeight: string) => void;
}

export function WeightCell({
  item,
  groupId,
  isSuperAdmin,
  rowSpan,
  onActualWeightChange,
  onWeightRatioChange,
}: WeightCellProps) {
  const handleActualWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 숫자와 소수점만 입력 허용, 최대 6자리 (9999.99 형태)
    const value = e.target.value.replace(/[^0-9.]/g, '');
    // 소수점이 하나만 들어가도록 제한
    const parts = value.split('.');
    const filteredValue = parts.length > 2 
      ? parts[0] + '.' + parts.slice(1).join('')
      : value;
    
    if (filteredValue.length <= 6) {
      const calculated = calculateWeight(filteredValue, item.weightRatio);
      onActualWeightChange(groupId, filteredValue, calculated);
    }
  };

  const handleWeightRatioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRatio = e.target.value as '5%' | '10%' | '15%' | '20%' | '';
    console.log('[비율 변경] 사용자가 선택한 비율:', newRatio, 'item.weightRatio:', item.weightRatio, 'groupId:', groupId);
    const calculated = calculateWeight(item.actualWeight, newRatio);
    onWeightRatioChange(groupId, newRatio, calculated);
  };

  return (
    <>
      {/* 실중량 */}
      <td rowSpan={rowSpan} className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200 align-middle">
        <div className="flex items-center justify-center gap-1">
          <input
            type="text"
            value={item.actualWeight}
            onChange={handleActualWeightChange}
            className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm text-center"
            placeholder="0"
            maxLength={6}
          />
          <span className="text-sm text-gray-700 whitespace-nowrap">kg</span>
        </div>
      </td>
      {/* 비율 - A 등급만 보임 */}
      {isSuperAdmin && (
        <td rowSpan={rowSpan} className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200 align-middle">
          <select
            value={item.weightRatio || ''}
            onChange={handleWeightRatioChange}
            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm text-center"
          >
            <option value="">선택</option>
            {WEIGHT_RATIOS.map(ratio => (
              <option key={ratio} value={ratio}>{ratio}</option>
            ))}
          </select>
        </td>
      )}
      {/* 중량 - A 등급만 보임 */}
      {isSuperAdmin && (
        <td rowSpan={rowSpan} className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200 align-middle">
          {item.calculatedWeight ? `${item.calculatedWeight}kg` : '-'}
        </td>
      )}
    </>
  );
}
