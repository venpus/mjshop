import { useMemo, useState } from 'react';
import { ArrowLeft, Calculator } from 'lucide-react';
import { handleNumberInputWheel } from '../../utils/preventNumberInputWheel';
import {
  calculateShopCost,
  formatShopCostCny,
  formatShopCostKrw,
  SHOP_COST_BAG_FILLER_CNY,
  SHOP_COST_EXCHANGE_RATE,
  SHOP_COST_INDEPENDENT_PACKING_CNY,
  SHOP_COST_LOGISTICS_EXCHANGE_RATE,
  SHOP_COST_WEIGHT_RATE_KRW,
} from './shopCostCalculator';

interface CostCalculatorToolProps {
  onBack: () => void;
}

const inputClass =
  'w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-right tabular-nums';

const EMPTY_UNIT_COSTS = ['', '', '', '', '', ''];

function ResultRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-gray-600 shrink-0">{label}</span>
      <span className={`tabular-nums ${bold ? 'font-bold text-purple-900' : 'font-medium text-gray-900'}`}>
        {value}
      </span>
    </div>
  );
}

export function CostCalculatorTool({ onBack }: CostCalculatorToolProps) {
  const [unitCostsCny, setUnitCostsCny] = useState<string[]>(EMPTY_UNIT_COSTS);
  const [independentPacking, setIndependentPacking] = useState(false);
  const [bagFiller, setBagFiller] = useState(false);
  const [weightGrams, setWeightGrams] = useState('');

  const result = useMemo(
    () =>
      calculateShopCost({
        unitCostsCny,
        independentPacking,
        bagFiller,
        weightGrams,
      }),
    [unitCostsCny, independentPacking, bagFiller, weightGrams]
  );

  const handleUnitCostChange = (index: number, value: string) => {
    setUnitCostsCny((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-100 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="p-0.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          aria-label="도구 목록으로"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <Calculator className="w-3.5 h-3.5 text-purple-600 shrink-0" />
        <h3 className="text-xs font-semibold text-gray-900">원가 계산기</h3>
      </div>

      <div className="px-3 py-2 space-y-2">
        <div>
          <p className="text-[10px] font-semibold text-gray-700 mb-1">상품 단가 (¥)</p>
          <div className="grid grid-cols-3 gap-1">
            {unitCostsCny.map((value, index) => (
              <input
                key={index}
                type="number"
                min={0}
                step="0.01"
                value={value}
                onChange={(e) => handleUnitCostChange(index, e.target.value)}
                onWheel={handleNumberInputWheel}
                className={inputClass}
                placeholder={`${index + 1}`}
                aria-label={`원가 ${index + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={independentPacking}
              onChange={(e) => setIndependentPacking(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-[11px] text-gray-800">
              독립포장 <span className="text-gray-400">+{SHOP_COST_INDEPENDENT_PACKING_CNY}</span>
            </span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={bagFiller}
              onChange={(e) => setBagFiller(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-[11px] text-gray-800">
              가방 충전재 <span className="text-gray-400">+{SHOP_COST_BAG_FILLER_CNY}</span>
            </span>
          </label>
        </div>

        <div className="rounded border border-blue-100 bg-blue-50/70 px-2 py-1.5 space-y-1">
          <ResultRow label="위안 합계" value={formatShopCostCny(result.totalCny)} />
          <ResultRow
            label={`× ${SHOP_COST_EXCHANGE_RATE}`}
            value={formatShopCostKrw(result.cnyToKrw)}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-gray-700 shrink-0">무게</span>
          <input
            type="number"
            min={0}
            step="0.1"
            value={weightGrams}
            onChange={(e) => setWeightGrams(e.target.value)}
            onWheel={handleNumberInputWheel}
            className={`${inputClass} flex-1 min-w-0`}
            placeholder="g"
            aria-label="무게(g)"
          />
        </div>

        <div className="rounded border border-gray-200 bg-gray-50 px-2 py-1.5">
          <ResultRow
            label={`물류비 (×${SHOP_COST_WEIGHT_RATE_KRW}×${SHOP_COST_LOGISTICS_EXCHANGE_RATE})`}
            value={formatShopCostKrw(result.logisticsFeeKrw)}
          />
        </div>

        <div className="rounded border border-purple-200 bg-purple-50 px-2 py-1.5">
          <ResultRow
            label="한화 합계"
            value={result.hasInput ? formatShopCostKrw(result.totalKrw) : '-'}
            bold
          />
        </div>
      </div>
    </div>
  );
}
