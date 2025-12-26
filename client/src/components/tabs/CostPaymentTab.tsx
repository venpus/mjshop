import { Plus, Trash2 } from "lucide-react";

export interface LaborCostItem {
  id: string;
  name: string;
  cost: number;
}

interface CostPaymentTabProps {
  // 기본 비용
  unitPrice: number;
  backMargin: number;
  quantity: number;
  commissionType: string;
  commissionAmount: number;
  basicCostTotal: number;
  isSuperAdmin: boolean; // A 레벨 관리자 여부
  onSetUnitPrice: (value: number) => void;
  onSetBackMargin: (value: number) => void;
  onSetQuantity: (value: number) => void;
  onHandleCommissionTypeChange: (value: string) => void;
  commissionOptions: Array<{ label: string; rate: number }>;
  
  // 운송비
  shippingCost: number;
  warehouseShippingCost: number;
  shippingCostTotal: number;
  onSetShippingCost: (value: number) => void;
  onSetWarehouseShippingCost: (value: number) => void;
  
  // 옵션 (포장 및 가공 부자재)
  optionItems: LaborCostItem[];
  totalOptionCost: number;
  onUpdateOptionItemName: (id: string, name: string) => void;
  onUpdateOptionItemCost: (id: string, cost: number) => void;
  onRemoveOptionItem: (id: string) => void;
  onAddOptionItem: () => void;
  
  // 인건비
  laborCostItems: LaborCostItem[];
  totalLaborCost: number;
  onUpdateLaborCostItemName: (id: string, name: string) => void;
  onUpdateLaborCostItemCost: (id: string, cost: number) => void;
  onRemoveLaborCostItem: (id: string) => void;
  onAddLaborCostItem: () => void;
  
  // 선금/잔금
  advancePaymentRate: number;
  advancePaymentAmount: number;
  advancePaymentDate: string;
  balancePaymentAmount: number;
  balancePaymentDate: string;
  finalPaymentAmount: number;
  onSetAdvancePaymentRate: (value: number) => void;
  onSetAdvancePaymentDate: (value: string) => void;
  onSetBalancePaymentDate: (value: string) => void;
}

export function CostPaymentTab({
  unitPrice,
  backMargin,
  quantity,
  commissionType,
  commissionAmount,
  basicCostTotal,
  isSuperAdmin,
  onSetUnitPrice,
  onSetBackMargin,
  onSetQuantity,
  onHandleCommissionTypeChange,
  commissionOptions,
  shippingCost,
  warehouseShippingCost,
  shippingCostTotal,
  onSetShippingCost,
  onSetWarehouseShippingCost,
  optionItems,
  totalOptionCost,
  onUpdateOptionItemName,
  onUpdateOptionItemCost,
  onRemoveOptionItem,
  onAddOptionItem,
  laborCostItems,
  totalLaborCost,
  onUpdateLaborCostItemName,
  onUpdateLaborCostItemCost,
  onRemoveLaborCostItem,
  onAddLaborCostItem,
  advancePaymentRate,
  advancePaymentAmount,
  advancePaymentDate,
  balancePaymentAmount,
  balancePaymentDate,
  finalPaymentAmount,
  onSetAdvancePaymentRate,
  onSetAdvancePaymentDate,
  onSetBalancePaymentDate,
}: CostPaymentTabProps) {
  return (
    <div className="space-y-4">
      {/* Cost sections in columns */}
      <div className="grid grid-cols-4 gap-5">
        {/* 기본 비용 */}
        <div className="space-y-3">
          <h4 className="text-sm text-gray-700 mb-3 pb-2 border-b border-gray-200 flex justify-between items-center">
            <span>기본 비용</span>
            <span className="text-lg font-semibold text-purple-700 bg-purple-100 px-3 py-1 rounded">
              ¥{basicCostTotal.toFixed(2)}
            </span>
          </h4>
          <div className="space-y-2">
            {/* 발주 단가 (모두 볼 수 있음) */}
            <div className="flex items-center gap-2">
              <span className="text-purple-700 bg-purple-100 px-2 py-1 rounded text-xs whitespace-nowrap min-w-[72px] font-semibold text-center">
                발주 단가
              </span>
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <span className="text-gray-500 text-sm">¥</span>
                <div className="flex-1 min-w-0 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-right text-sm text-gray-700">
                  {(unitPrice + backMargin).toFixed(2)}
                </div>
              </div>
            </div>
            {/* 기본 단가 (A 레벨 관리자만) */}
            {isSuperAdmin && (
              <div className="flex items-center gap-2">
                <span className="text-purple-700 bg-purple-100 px-2 py-1 rounded text-xs whitespace-nowrap min-w-[72px] font-semibold text-center">
                  기본 단가
                </span>
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <span className="text-gray-500 text-sm">¥</span>
                  <input
                    type="number"
                    value={unitPrice || ""}
                    onChange={(e) =>
                      onSetUnitPrice(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)
                    }
                    step="0.01"
                    className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}
            {/* 추가 단가 (A 레벨 관리자만) */}
            {isSuperAdmin && (
              <div className="flex items-center gap-2">
                <span className="text-purple-700 bg-purple-100 px-2 py-1 rounded text-xs whitespace-nowrap min-w-[72px] font-semibold text-center">
                  추가 단가
                </span>
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <span className="text-gray-500 text-sm">¥</span>
                  <input
                    type="number"
                    value={backMargin || ""}
                    onChange={(e) =>
                      onSetBackMargin(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)
                    }
                    step="0.01"
                    className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-purple-700 bg-purple-100 px-2 py-1 rounded text-xs whitespace-nowrap min-w-[72px] font-semibold text-center">
                수량
              </span>
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <input
                  type="number"
                  value={quantity || ""}
                  onChange={(e) =>
                    onSetQuantity(e.target.value === "" ? 0 : parseInt(e.target.value) || 0)
                  }
                  className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-gray-500 text-xs min-w-[16px]">개</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-xs whitespace-nowrap min-w-[72px]">
                수수료율
              </span>
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <select
                  value={commissionType}
                  onChange={(e) =>
                    onHandleCommissionTypeChange(e.target.value)
                  }
                  className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {commissionOptions.map((opt) => (
                    <option key={opt.label} value={opt.label}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-xs whitespace-nowrap min-w-[72px]">
                수수료 금액
              </span>
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <span className="text-gray-500 text-sm">¥</span>
                <div className="flex-1 min-w-0 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-right text-sm text-gray-700">
                  {commissionAmount.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 운송비 */}
        <div className="space-y-3 border-l border-gray-200 pl-5">
          <h4 className="text-sm text-gray-700 mb-3 pb-2 border-b border-gray-200 flex justify-between items-center">
            <span>운송비</span>
            <span className="text-lg font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded">
              ¥{shippingCostTotal.toFixed(2)}
            </span>
          </h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-xs whitespace-nowrap min-w-[72px]">
                업체 배송비
              </span>
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <span className="text-gray-500 text-sm">¥</span>
                <input
                  type="number"
                  value={shippingCost || ""}
                  onChange={(e) =>
                    onSetShippingCost(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)
                  }
                  step="0.01"
                  className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-xs whitespace-nowrap min-w-[72px]">
                창고 배송비
              </span>
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <span className="text-gray-500 text-sm">¥</span>
                <input
                  type="number"
                  value={warehouseShippingCost || ""}
                  onChange={(e) =>
                    onSetWarehouseShippingCost(
                      e.target.value === "" ? 0 : parseFloat(e.target.value) || 0,
                    )
                  }
                  step="0.01"
                  className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 옵션 */}
        <div className="space-y-3 border-l border-gray-200 pl-5">
          <h4 className="text-sm text-gray-700 mb-3 pb-2 border-b border-gray-200 flex justify-between items-center">
            <span>포장 및 가공 부자재</span>
            <span className="text-lg font-semibold text-green-700 bg-green-100 px-3 py-1 rounded">
              ¥{totalOptionCost.toFixed(2)}
            </span>
          </h4>
          <div className="space-y-2">
            {optionItems.map((item) => (
              <div key={item.id} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) =>
                    onUpdateOptionItemName(item.id, e.target.value)
                  }
                  placeholder="항목명"
                  className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-gray-500 text-xs">¥</span>
                <input
                  type="number"
                  value={item.cost || ""}
                  onChange={(e) =>
                    onUpdateOptionItemCost(
                      item.id,
                      e.target.value === "" ? 0 : parseFloat(e.target.value) || 0,
                    )
                  }
                  step="0.01"
                  className="w-16 px-1.5 py-1.5 border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={() => onRemoveOptionItem(item.id)}
                  className="text-red-500 hover:text-red-700 flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={onAddOptionItem}
              className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 text-xs w-full justify-center mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>추가</span>
            </button>
          </div>
        </div>

        {/* 인건비 */}
        <div className="space-y-3 border-l border-gray-200 pl-5">
          <h4 className="text-sm text-gray-700 mb-3 pb-2 border-b border-gray-200 flex justify-between items-center">
            <span>인건비</span>
            <span className="text-lg font-semibold text-orange-700 bg-orange-100 px-3 py-1 rounded">
              ¥{totalLaborCost.toFixed(2)}
            </span>
          </h4>
          <div className="space-y-2">
            {laborCostItems.map((item) => (
              <div key={item.id} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) =>
                    onUpdateLaborCostItemName(item.id, e.target.value)
                  }
                  placeholder="항목명"
                  className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-gray-500 text-xs">¥</span>
                <input
                  type="number"
                  value={item.cost || ""}
                  onChange={(e) =>
                    onUpdateLaborCostItemCost(
                      item.id,
                      e.target.value === "" ? 0 : parseFloat(e.target.value) || 0,
                    )
                  }
                  step="0.01"
                  className="w-16 px-1.5 py-1.5 border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={() => onRemoveLaborCostItem(item.id)}
                  className="text-red-500 hover:text-red-700 flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={onAddLaborCostItem}
              className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 text-xs w-full justify-center mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>추가</span>
            </button>
          </div>
        </div>
      </div>

      {/* 최종 결제 금액 */}
      <div className="pt-4 border-t-2 border-gray-300">
        <div className="flex items-start gap-8">
          {/* 선금/잔금 정보 */}
          <div className="flex-1 bg-gray-50 rounded-lg p-5">
            <div className="grid grid-cols-2 gap-8">
              {/* 선금 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-900 font-semibold">선금</span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={advancePaymentRate || ""}
                        onChange={(e) =>
                          onSetAdvancePaymentRate(
                            e.target.value === "" ? 0 : parseFloat(e.target.value) || 0,
                          )
                        }
                        min="0"
                        max="100"
                        step="1"
                        className="w-20 px-3 py-1.5 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-600">%</span>
                    </div>
                    <span className="text-lg font-semibold text-blue-700 bg-blue-100 px-4 py-1.5 rounded">
                      ¥
                      {advancePaymentAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    선금 지불일자
                  </span>
                  <input
                    type="date"
                    value={advancePaymentDate}
                    onChange={(e) =>
                      onSetAdvancePaymentDate(e.target.value)
                    }
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* 잔금 */}
              <div className="space-y-3 border-l border-gray-300 pl-8">
                <div className="flex items-center justify-between">
                  <span className="text-gray-900 font-semibold">잔금</span>
                  <span className="text-lg font-semibold text-orange-700 bg-orange-100 px-4 py-1.5 rounded">
                    ¥
                    {balancePaymentAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    잔금 지불일자
                  </span>
                  <input
                    type="date"
                    value={balancePaymentDate}
                    onChange={(e) =>
                      onSetBalancePaymentDate(e.target.value)
                    }
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 최종 결제 금액 라벨 및 금액 표시 */}
          <div className="flex flex-col items-end gap-2">
            <span className="text-gray-900 font-semibold whitespace-nowrap">
              최종 결제 금액
            </span>
            <span className="text-2xl font-bold text-purple-700 bg-purple-100 px-5 py-2.5 rounded-lg whitespace-nowrap">
              ¥
              {finalPaymentAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}