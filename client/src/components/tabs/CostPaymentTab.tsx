import { Plus, Trash2 } from "lucide-react";
import { handleNumberInput, formatNumberForInput } from "../../utils/numberInputUtils";

export interface LaborCostItem {
  id: string;
  name: string;
  unit_price: number;
  quantity: number;
  cost: number; // 계산값: unit_price * quantity
  isAdminOnly?: boolean; // A 레벨 관리자 전용 항목 여부
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
  userLevel?: 'A-SuperAdmin' | 'S: Admin' | 'B0: 중국Admin' | 'C0: 한국Admin'; // 사용자 레벨
  onSetUnitPrice: (value: number) => void;
  onSetBackMargin: (value: number) => void;
  onSetQuantity: (value: number) => void;
  onHandleCommissionTypeChange: (value: string) => void;
  commissionOptions: Array<{ label: string; rate: number }>;
  
  // 운송비
  shippingCost: number;
  warehouseShippingCost: number;
  shippingCostTotal: number;
  packingListShippingCost: number; // 패킹리스트 배송비 (읽기 전용)
  onSetShippingCost: (value: number) => void;
  onSetWarehouseShippingCost: (value: number) => void;
  
  // 옵션 (포장 및 가공 부자재)
  optionItems: LaborCostItem[];
  totalOptionCost: number;
  onUpdateOptionItemName: (id: string, name: string) => void;
  onUpdateOptionItemUnitPrice: (id: string, unitPrice: number) => void;
  onUpdateOptionItemQuantity: (id: string, quantity: number) => void;
  onRemoveOptionItem: (id: string) => void;
  onAddOptionItem: (isAdminOnly?: boolean) => void;
  
  // 인건비
  laborCostItems: LaborCostItem[];
  totalLaborCost: number;
  onUpdateLaborCostItemName: (id: string, name: string) => void;
  onUpdateLaborCostItemUnitPrice: (id: string, unitPrice: number) => void;
  onUpdateLaborCostItemQuantity: (id: string, quantity: number) => void;
  onRemoveLaborCostItem: (id: string) => void;
  onAddLaborCostItem: (isAdminOnly?: boolean) => void;
  
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
  userLevel,
  onSetUnitPrice,
  onSetBackMargin,
  onSetQuantity,
  onHandleCommissionTypeChange,
  commissionOptions,
  shippingCost,
  warehouseShippingCost,
  shippingCostTotal,
  packingListShippingCost,
  onSetShippingCost,
  onSetWarehouseShippingCost,
  optionItems,
  totalOptionCost,
  onUpdateOptionItemName,
  onUpdateOptionItemUnitPrice,
  onUpdateOptionItemQuantity,
  onRemoveOptionItem,
  onAddOptionItem,
  laborCostItems,
  totalLaborCost,
  onUpdateLaborCostItemName,
  onUpdateLaborCostItemUnitPrice,
  onUpdateLaborCostItemQuantity,
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
  // 레벨별 권한 확인
  const isLevelA = isSuperAdmin; // A-SuperAdmin
  const isLevelSorB = userLevel === 'S: Admin' || userLevel === 'B0: 중국Admin'; // S 또는 B 레벨
  const isLevelC = userLevel === 'C0: 한국Admin'; // C 레벨
  
  // 항목을 일반 항목과 A레벨 전용 항목으로 분리
  const normalOptionItems = optionItems.filter(item => !item.isAdminOnly);
  const adminOnlyOptionItems = optionItems.filter(item => item.isAdminOnly);
  
  const normalLaborCostItems = laborCostItems.filter(item => !item.isAdminOnly);
  const adminOnlyLaborCostItems = laborCostItems.filter(item => item.isAdminOnly);
  
  // 항목 추가 버튼 표시 여부: C 레벨은 표시 안 함
  const canAddItems = isLevelA || isLevelSorB;
  return (
    <div className="space-y-4">
      {/* Cost sections in columns */}
      <div className="grid grid-cols-[1fr_auto_1fr_1fr] gap-5">
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
                    value={formatNumberForInput(unitPrice)}
                    onChange={(e) => {
                      const processedValue = handleNumberInput(e.target.value);
                      if (processedValue !== e.target.value) {
                        e.target.value = processedValue;
                      }
                      onSetUnitPrice(processedValue === "" ? 0 : parseFloat(processedValue) || 0);
                    }}
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
                    value={formatNumberForInput(backMargin)}
                    onChange={(e) => {
                      const processedValue = handleNumberInput(e.target.value);
                      if (processedValue !== e.target.value) {
                        e.target.value = processedValue;
                      }
                      onSetBackMargin(processedValue === "" ? 0 : parseFloat(processedValue) || 0);
                    }}
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
        <div className="space-y-3 border-l border-gray-200 pl-5 w-fit">
          <h4 className="text-sm text-gray-700 mb-3 pb-2 border-b border-gray-200 flex flex-col gap-1">
            <span>운송비</span>
            <span className="text-lg font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded self-start">
              ¥{shippingCostTotal.toFixed(2)}
            </span>
          </h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-xs whitespace-nowrap min-w-[72px]">
                업체 배송비
              </span>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 text-sm">¥</span>
                <input
                  type="number"
                  value={formatNumberForInput(shippingCost)}
                  onChange={(e) => {
                    const processedValue = handleNumberInput(e.target.value);
                    if (processedValue !== e.target.value) {
                      e.target.value = processedValue;
                    }
                    onSetShippingCost(processedValue === "" ? 0 : parseFloat(processedValue) || 0);
                  }}
                  step="0.01"
                  className="w-24 px-2 py-1.5 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-xs whitespace-nowrap min-w-[72px]">
                창고 배송비
              </span>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 text-sm">¥</span>
                <input
                  type="number"
                  value={formatNumberForInput(warehouseShippingCost)}
                  onChange={(e) => {
                    const processedValue = handleNumberInput(e.target.value);
                    if (processedValue !== e.target.value) {
                      e.target.value = processedValue;
                    }
                    onSetWarehouseShippingCost(processedValue === "" ? 0 : parseFloat(processedValue) || 0);
                  }}
                  step="0.01"
                  className="w-24 px-2 py-1.5 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            {/* 패킹리스트 배송비 (읽기 전용) */}
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-xs whitespace-nowrap min-w-[72px]">
                패킹리스트 배송비
              </span>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 text-sm">¥</span>
                <div className="w-24 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-right text-sm text-gray-700">
                  {packingListShippingCost.toFixed(2)}
                </div>
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
          {isLevelC ? (
            // C 레벨은 항목 목록 숨김
            <div className="text-sm text-gray-500 text-center py-4">
              합계만 표시됩니다
            </div>
          ) : (
            <div className="space-y-4">
              {/* 일반 영역 (S, B 레벨도 입력 가능) */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-600 mb-2">일반 항목</div>
                {normalOptionItems.map((item) => {
                  const calculatedCost = item.unit_price * item.quantity;
                  // 일반 항목은 A, S, B 레벨 모두 수정 가능
                  const isEditable = isLevelA || isLevelSorB;
                  return (
                    <div key={item.id} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) =>
                          onUpdateOptionItemName(item.id, e.target.value)
                        }
                        placeholder="항목명"
                        disabled={!isEditable}
                        className={`flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 ${!isEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                      <span className="text-gray-500 text-xs">¥</span>
                      <input
                        type="number"
                        value={formatNumberForInput(item.unit_price)}
                        onChange={(e) => {
                          const processedValue = handleNumberInput(e.target.value);
                          if (processedValue !== e.target.value) {
                            e.target.value = processedValue;
                          }
                          onUpdateOptionItemUnitPrice(
                            item.id,
                            processedValue === "" ? 0 : parseFloat(processedValue) || 0,
                          );
                        }}
                        step="0.01"
                        placeholder="단가"
                        disabled={!isEditable}
                        className={`w-16 px-1.5 py-1.5 border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 ${!isEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                      <span className="text-gray-500 text-xs">×</span>
                      <input
                        type="number"
                        value={formatNumberForInput(item.quantity)}
                        onChange={(e) => {
                          const processedValue = handleNumberInput(e.target.value);
                          if (processedValue !== e.target.value) {
                            e.target.value = processedValue;
                          }
                          onUpdateOptionItemQuantity(
                            item.id,
                            processedValue === "" ? 0 : parseFloat(processedValue) || 0,
                          );
                        }}
                        step="0.01"
                        placeholder="수량"
                        disabled={!isEditable}
                        className={`w-16 px-1.5 py-1.5 border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 ${!isEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                      <span className="text-gray-500 text-xs">=</span>
                      <div className="w-20 px-1.5 py-1.5 bg-gray-50 border border-gray-300 rounded text-right text-xs text-gray-700">
                        ¥{calculatedCost.toFixed(2)}
                      </div>
                      {isEditable && (
                        <button
                          onClick={() => onRemoveOptionItem(item.id)}
                          className="text-red-500 hover:text-red-700 flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
                {canAddItems && (
                  <button
                    onClick={() => onAddOptionItem(false)}
                    className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 text-xs w-full justify-center mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>일반 항목 추가</span>
                  </button>
                )}
              </div>

              {/* A레벨 전용 영역 (A 레벨만 볼 수 있음) */}
              {isLevelA && (
                <div className="space-y-2 pt-2 border-t border-blue-200">
                  <div className="text-xs font-semibold text-blue-600 mb-2 flex items-center gap-1">
                    <span className="text-blue-600 text-xs font-semibold px-1.5 py-0.5 bg-blue-100 rounded">A</span>
                    <span>A 레벨 관리자 전용</span>
                  </div>
                  {adminOnlyOptionItems.map((item) => {
                    const calculatedCost = item.unit_price * item.quantity;
                    // A 레벨 전용 항목은 A 레벨만 수정 가능
                    return (
                      <div key={item.id} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded p-1">
                        <span className="text-blue-600 text-xs font-semibold px-1" title="A 레벨 관리자 전용">A</span>
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
                          value={formatNumberForInput(item.unit_price)}
                          onChange={(e) => {
                            const processedValue = handleNumberInput(e.target.value);
                            if (processedValue !== e.target.value) {
                              e.target.value = processedValue;
                            }
                            onUpdateOptionItemUnitPrice(
                              item.id,
                              processedValue === "" ? 0 : parseFloat(processedValue) || 0,
                            );
                          }}
                          step="0.01"
                          placeholder="단가"
                          className="w-16 px-1.5 py-1.5 border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <span className="text-gray-500 text-xs">×</span>
                        <input
                          type="number"
                          value={formatNumberForInput(item.quantity)}
                          onChange={(e) => {
                            const processedValue = handleNumberInput(e.target.value);
                            if (processedValue !== e.target.value) {
                              e.target.value = processedValue;
                            }
                            onUpdateOptionItemQuantity(
                              item.id,
                              processedValue === "" ? 0 : parseFloat(processedValue) || 0,
                            );
                          }}
                          step="0.01"
                          placeholder="수량"
                          className="w-16 px-1.5 py-1.5 border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <span className="text-gray-500 text-xs">=</span>
                        <div className="w-20 px-1.5 py-1.5 bg-gray-50 border border-gray-300 rounded text-right text-xs text-gray-700">
                          ¥{calculatedCost.toFixed(2)}
                        </div>
                        <button
                          onClick={() => onRemoveOptionItem(item.id)}
                          className="text-red-500 hover:text-red-700 flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                  <button
                    onClick={() => onAddOptionItem(true)}
                    className="flex items-center gap-1 px-2 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs w-full justify-center mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>A 레벨 전용 항목 추가</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 인건비 */}
        <div className="space-y-3 border-l border-gray-200 pl-5">
          <h4 className="text-sm text-gray-700 mb-3 pb-2 border-b border-gray-200 flex justify-between items-center">
            <span>인건비</span>
            <span className="text-lg font-semibold text-orange-700 bg-orange-100 px-3 py-1 rounded">
              ¥{totalLaborCost.toFixed(2)}
            </span>
          </h4>
          {isLevelC ? (
            // C 레벨은 항목 목록 숨김
            <div className="text-sm text-gray-500 text-center py-4">
              합계만 표시됩니다
            </div>
          ) : (
            <div className="space-y-4">
              {/* 일반 영역 (S, B 레벨도 입력 가능) */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-600 mb-2">일반 항목</div>
                {normalLaborCostItems.map((item) => {
                  const calculatedCost = item.unit_price * item.quantity;
                  // 일반 항목은 A, S, B 레벨 모두 수정 가능
                  const isEditable = isLevelA || isLevelSorB;
                  return (
                    <div key={item.id} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) =>
                          onUpdateLaborCostItemName(item.id, e.target.value)
                        }
                        placeholder="항목명"
                        disabled={!isEditable}
                        className={`flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 ${!isEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                      <span className="text-gray-500 text-xs">¥</span>
                      <input
                        type="number"
                        value={formatNumberForInput(item.unit_price)}
                        onChange={(e) => {
                          const processedValue = handleNumberInput(e.target.value);
                          if (processedValue !== e.target.value) {
                            e.target.value = processedValue;
                          }
                          onUpdateLaborCostItemUnitPrice(
                            item.id,
                            processedValue === "" ? 0 : parseFloat(processedValue) || 0,
                          );
                        }}
                        step="0.01"
                        placeholder="단가"
                        disabled={!isEditable}
                        className={`w-16 px-1.5 py-1.5 border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 ${!isEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                      <span className="text-gray-500 text-xs">×</span>
                      <input
                        type="number"
                        value={formatNumberForInput(item.quantity)}
                        onChange={(e) => {
                          const processedValue = handleNumberInput(e.target.value);
                          if (processedValue !== e.target.value) {
                            e.target.value = processedValue;
                          }
                          onUpdateLaborCostItemQuantity(
                            item.id,
                            processedValue === "" ? 0 : parseFloat(processedValue) || 0,
                          );
                        }}
                        step="0.01"
                        placeholder="수량"
                        disabled={!isEditable}
                        className={`w-16 px-1.5 py-1.5 border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 ${!isEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                      <span className="text-gray-500 text-xs">=</span>
                      <div className="w-20 px-1.5 py-1.5 bg-gray-50 border border-gray-300 rounded text-right text-xs text-gray-700">
                        ¥{calculatedCost.toFixed(2)}
                      </div>
                      {isEditable && (
                        <button
                          onClick={() => onRemoveLaborCostItem(item.id)}
                          className="text-red-500 hover:text-red-700 flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
                {canAddItems && (
                  <button
                    onClick={() => onAddLaborCostItem(false)}
                    className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 text-xs w-full justify-center mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>일반 항목 추가</span>
                  </button>
                )}
              </div>

              {/* A레벨 전용 영역 (A 레벨만 볼 수 있음) */}
              {isLevelA && (
                <div className="space-y-2 pt-2 border-t border-blue-200">
                  <div className="text-xs font-semibold text-blue-600 mb-2 flex items-center gap-1">
                    <span className="text-blue-600 text-xs font-semibold px-1.5 py-0.5 bg-blue-100 rounded">A</span>
                    <span>A 레벨 관리자 전용</span>
                  </div>
                  {adminOnlyLaborCostItems.map((item) => {
                    const calculatedCost = item.unit_price * item.quantity;
                    // A 레벨 전용 항목은 A 레벨만 수정 가능
                    return (
                      <div key={item.id} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded p-1">
                        <span className="text-blue-600 text-xs font-semibold px-1" title="A 레벨 관리자 전용">A</span>
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
                          value={formatNumberForInput(item.unit_price)}
                          onChange={(e) => {
                            const processedValue = handleNumberInput(e.target.value);
                            if (processedValue !== e.target.value) {
                              e.target.value = processedValue;
                            }
                            onUpdateLaborCostItemUnitPrice(
                              item.id,
                              processedValue === "" ? 0 : parseFloat(processedValue) || 0,
                            );
                          }}
                          step="0.01"
                          placeholder="단가"
                          className="w-16 px-1.5 py-1.5 border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <span className="text-gray-500 text-xs">×</span>
                        <input
                          type="number"
                          value={formatNumberForInput(item.quantity)}
                          onChange={(e) => {
                            const processedValue = handleNumberInput(e.target.value);
                            if (processedValue !== e.target.value) {
                              e.target.value = processedValue;
                            }
                            onUpdateLaborCostItemQuantity(
                              item.id,
                              processedValue === "" ? 0 : parseFloat(processedValue) || 0,
                            );
                          }}
                          step="0.01"
                          placeholder="수량"
                          className="w-16 px-1.5 py-1.5 border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <span className="text-gray-500 text-xs">=</span>
                        <div className="w-20 px-1.5 py-1.5 bg-gray-50 border border-gray-300 rounded text-right text-xs text-gray-700">
                          ¥{calculatedCost.toFixed(2)}
                        </div>
                        <button
                          onClick={() => onRemoveLaborCostItem(item.id)}
                          className="text-red-500 hover:text-red-700 flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                  <button
                    onClick={() => onAddLaborCostItem(true)}
                    className="flex items-center gap-1 px-2 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs w-full justify-center mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>A 레벨 전용 항목 추가</span>
                  </button>
                </div>
              )}
            </div>
          )}
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
                        value={formatNumberForInput(advancePaymentRate)}
                        onChange={(e) => {
                          const processedValue = handleNumberInput(e.target.value);
                          if (processedValue !== e.target.value) {
                            e.target.value = processedValue;
                          }
                          onSetAdvancePaymentRate(
                            processedValue === "" ? 0 : parseFloat(processedValue) || 0,
                          );
                        }}
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