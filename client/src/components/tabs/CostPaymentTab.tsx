import { Plus, Trash2 } from "lucide-react";
import { DecimalInput } from "../ui/DecimalInput";
import { useLanguage } from "../../contexts/LanguageContext";

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
  userLevel?: 'A-SuperAdmin' | 'S: Admin' | 'B0: 중국Admin' | 'C0: 한국Admin' | 'D0: 비전 담당자'; // 사용자 레벨
  canWrite?: boolean; // 쓰기 권한 여부
  /** 비용 입력(기본단가, 배송비, 부자재 일반, 인건비 일반, 추가단가, 수량, 수수료율, 선금 비율) 허용 사용자만 true */
  canEditCostInput?: boolean;
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
  canWrite = true, // 기본값은 true (하위 호환성)
  canEditCostInput = true, // 기본값 true (하위 호환성)
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
  const { t } = useLanguage();
  const isLevelA = isSuperAdmin;
  const isLevelSorB = userLevel === "S: Admin" || userLevel === "B0: 중국Admin";
  const isLevelC = userLevel === "C0: 한국Admin";
  
  // 항목을 일반 항목과 A레벨 전용 항목으로 분리
  const normalOptionItems = optionItems.filter(item => !item.isAdminOnly);
  const adminOnlyOptionItems = optionItems.filter(item => item.isAdminOnly);
  
  const normalLaborCostItems = laborCostItems.filter(item => !item.isAdminOnly);
  const adminOnlyLaborCostItems = laborCostItems.filter(item => item.isAdminOnly);
  
  // 항목 추가 버튼 표시 여부: C 레벨은 표시 안 함, 쓰기 권한 + 비용 입력 허용 사용자
  const canAddItems = (isLevelA || isLevelSorB) && canWrite && canEditCostInput;
  // A 전용 항목 추가: A 레벨 + 쓰기 권한만 있으면 가능 (비용 입력 허용 목록과 무관)
  const canAddAdminOnlyItems = isLevelA && canWrite;
  // 비용 필드 편집 가능 여부 (기본단가, 수량, 수수료율, 배송비 등 - venpus 등 허용 사용자만)
  const canEditCostFields = canWrite && canEditCostInput;
  // 추가 단가 편집: A-SuperAdmin + 쓰기 권한이면 가능 (비용 입력 허용 목록과 무관)
  const canEditBackMargin = isLevelA && canWrite;
  return (
    <div className="space-y-4">
      {/* Cost sections in columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_1fr] gap-4 md:gap-5">
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
                  <DecimalInput
                    value={unitPrice}
                    onChange={onSetUnitPrice}
                    step="0.01"
                    disabled={!canEditCostFields}
                    className={`flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${!canWrite ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                  <DecimalInput
                    value={backMargin}
                    onChange={onSetBackMargin}
                    step="0.01"
                    disabled={!canEditBackMargin}
                    className={`flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${!canEditBackMargin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                  disabled={!canEditCostFields}
                  className={`flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${!canWrite ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
                <span className="text-gray-500 text-xs min-w-[16px]">{t("purchaseOrder.list.quantityUnit")}</span>
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
                  disabled={!canEditCostFields}
                  className={`flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${!canWrite ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
            <span>{t("purchaseOrder.detail.shippingCost")}</span>
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
                <DecimalInput
                  value={shippingCost}
                  onChange={onSetShippingCost}
                  step="0.01"
                  disabled={!canEditCostFields}
                  className={`w-24 px-2 py-1.5 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${!canWrite ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-xs whitespace-nowrap min-w-[72px]">
                창고 배송비
              </span>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 text-sm">¥</span>
                <DecimalInput
                  value={warehouseShippingCost}
                  onChange={onSetWarehouseShippingCost}
                  step="0.01"
                  disabled={!canEditCostFields}
                  className={`w-24 px-2 py-1.5 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${!canWrite ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
          <div className="space-y-4">
            {/* 일반 항목 */}
            <div className="space-y-2">
              {!isLevelC && <div className="text-xs font-semibold text-gray-600 mb-2">{t("purchaseOrder.detail.generalItems")}</div>}
              {normalOptionItems.map((item) => {
                  const calculatedCost = item.unit_price * item.quantity;
                  const isEditable = canAddItems;
                  return (
                    <div key={item.id} className="space-y-1">
                      {/* 모바일 전용: 두 줄 (항목이름 / 비용 계산) */}
                      <div className="md:hidden flex flex-col gap-1 rounded border border-gray-200 bg-gray-50/50 p-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isEditable && (
                            <button
                              onClick={() => onRemoveOptionItem(item.id)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors shrink-0"
                              title="항목 삭제"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                          {isEditable ? (
                            <input
                              type="text"
                              value={item.name || ''}
                              onChange={(e) => onUpdateOptionItemName(item.id, e.target.value)}
                              placeholder={t("purchaseOrder.detail.itemNamePlaceholder")}
                              className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          ) : (
                            <div className="flex-1 min-w-0 px-2 py-1.5 bg-gray-50 border border-gray-300 rounded text-xs text-gray-700 font-medium">
                              {item.name || '항목명'}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap text-xs">
                          <span className="text-gray-500">¥</span>
                          {isEditable ? (
                            <DecimalInput
                              value={item.unit_price}
                              onChange={(v) => onUpdateOptionItemUnitPrice(item.id, v)}
                              step="0.01"
                              className="w-16 px-1.5 py-1.5 border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          ) : (
                            <span className="text-gray-700">{item.unit_price.toFixed(2)}</span>
                          )}
                          <span className="text-gray-500">×</span>
                          {isEditable ? (
                            <DecimalInput
                              value={item.quantity}
                              onChange={(v) => onUpdateOptionItemQuantity(item.id, v)}
                              step="0.01"
                              className="w-16 px-1.5 py-1.5 border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          ) : (
                            <span className="text-gray-700">{item.quantity.toFixed(2)}</span>
                          )}
                          <span className="text-gray-500">=</span>
                          <span className="font-semibold text-green-700">¥{calculatedCost.toFixed(2)}</span>
                        </div>
                      </div>
                      {/* 데스크톱 전용: 한 줄 (원래 레이아웃) */}
                      <div className="hidden md:flex items-center gap-1.5">
                        {isEditable && (
                          <button
                            onClick={() => onRemoveOptionItem(item.id)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            title="항목 삭제"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                        {isEditable ? (
                          <input
                            type="text"
                            value={item.name || ''}
                            onChange={(e) => onUpdateOptionItemName(item.id, e.target.value)}
                            placeholder={t("purchaseOrder.detail.itemNamePlaceholder")}
                            className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        ) : (
                          <div className="flex-1 min-w-0 px-2 py-1.5 bg-gray-50 border border-gray-300 rounded text-xs text-gray-700">
                            {item.name || '항목명'}
                          </div>
                        )}
                        <span className="text-gray-500 text-xs">¥</span>
                        {isEditable ? (
                          <DecimalInput
                            value={item.unit_price}
                            onChange={(v) => onUpdateOptionItemUnitPrice(item.id, v)}
                            step="0.01"
                            className="w-16 px-1.5 py-1.5 border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        ) : (
                          <div className="w-16 px-1.5 py-1.5 bg-gray-50 border border-gray-300 rounded text-right text-xs text-gray-700">
                            {item.unit_price.toFixed(2)}
                          </div>
                        )}
                        <span className="text-gray-500 text-xs">×</span>
                        {isEditable ? (
                          <DecimalInput
                            value={item.quantity}
                            onChange={(v) => onUpdateOptionItemQuantity(item.id, v)}
                            step="0.01"
                            className="w-16 px-1.5 py-1.5 border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        ) : (
                          <div className="w-16 px-1.5 py-1.5 bg-gray-50 border border-gray-300 rounded text-right text-xs text-gray-700">
                            {item.quantity.toFixed(2)}
                          </div>
                        )}
                        <span className="text-gray-500 text-xs">=</span>
                        <div className="w-20 px-1.5 py-1.5 bg-gray-50 border border-gray-200 rounded text-right text-xs text-gray-700">
                          ¥{calculatedCost.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              {canAddItems && (
                <button
                  onClick={() => onAddOptionItem(false)}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 border border-green-300 rounded transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  일반 항목 추가
                </button>
              )}
              </div>

            {/* A레벨 전용 영역 (A 레벨과 C0 레벨에서 볼 수 있음) */}
            {(isLevelA || isLevelC) && (
              <div className={`space-y-2 ${isLevelA ? 'pt-2 border-t border-blue-200' : ''}`}>
                {isLevelA && (
                  <div className="text-xs font-semibold text-blue-600 mb-2 flex items-center gap-1">
                    <span className="text-blue-600 text-xs font-semibold px-1.5 py-0.5 bg-blue-100 rounded">A</span>
                    <span>A 레벨 관리자 전용</span>
                  </div>
                )}
                {adminOnlyOptionItems.map((item) => {
                  const calculatedCost = item.unit_price * item.quantity;
                  const isEditable = isLevelA && canWrite;
                  return (
                    <div key={item.id} className="space-y-1">
                      {/* 모바일 전용: 두 줄 */}
                      <div className={`md:hidden flex flex-col gap-1 rounded border p-2 ${isLevelA ? 'bg-blue-50 border-blue-200' : 'bg-gray-50/50 border-gray-200'}`}>
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isLevelA && (
                            <span className="text-blue-600 text-xs font-semibold px-1 shrink-0" title="A 레벨 관리자 전용">A</span>
                          )}
                          {isEditable && (
                            <button
                              onClick={() => onRemoveOptionItem(item.id)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors shrink-0"
                              title="항목 삭제"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                          {isEditable ? (
                            <input
                              type="text"
                              value={item.name || ''}
                              onChange={(e) => onUpdateOptionItemName(item.id, e.target.value)}
                              placeholder={t("purchaseOrder.detail.itemNamePlaceholder")}
                              className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          ) : (
                            <div className="flex-1 min-w-0 px-2 py-1.5 bg-gray-50 border border-gray-300 rounded text-xs text-gray-700 font-medium">
                              {item.name || '항목명'}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap text-xs">
                          <span className="text-gray-500">¥</span>
                          {isEditable ? (
                            <DecimalInput
                              value={item.unit_price}
                              onChange={(v) => onUpdateOptionItemUnitPrice(item.id, v)}
                              step="0.01"
                              className="w-16 px-1.5 py-1.5 border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          ) : (
                            <span className="text-gray-700">{item.unit_price.toFixed(2)}</span>
                          )}
                          <span className="text-gray-500">×</span>
                          {isEditable ? (
                            <DecimalInput
                              value={item.quantity}
                              onChange={(v) => onUpdateOptionItemQuantity(item.id, v)}
                              step="0.01"
                              className="w-16 px-1.5 py-1.5 border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          ) : (
                            <span className="text-gray-700">{item.quantity.toFixed(2)}</span>
                          )}
                          <span className="text-gray-500">=</span>
                          <span className="font-semibold text-green-700">¥{calculatedCost.toFixed(2)}</span>
                        </div>
                      </div>
                      {/* 데스크톱 전용: 한 줄 */}
                      <div className={`hidden md:flex items-center gap-1.5 ${isLevelA ? 'bg-blue-50 border border-blue-200 rounded p-1' : ''}`}>
                        {isLevelA && (
                          <span className="text-blue-600 text-xs font-semibold px-1" title="A 레벨 관리자 전용">A</span>
                        )}
                        {isEditable && (
                          <button
                            onClick={() => onRemoveOptionItem(item.id)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            title="항목 삭제"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                        {isEditable ? (
                          <input
                            type="text"
                            value={item.name || ''}
                            onChange={(e) => onUpdateOptionItemName(item.id, e.target.value)}
                            placeholder={t("purchaseOrder.detail.itemNamePlaceholder")}
                            className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        ) : (
                          <div className="flex-1 min-w-0 px-2 py-1.5 bg-gray-50 border border-gray-300 rounded text-xs text-gray-700">
                            {item.name || '항목명'}
                          </div>
                        )}
                        <span className="text-gray-500 text-xs">¥</span>
                        {isEditable ? (
                          <DecimalInput
                            value={item.unit_price}
                            onChange={(v) => onUpdateOptionItemUnitPrice(item.id, v)}
                            step="0.01"
                            className="w-16 px-1.5 py-1.5 border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        ) : (
                          <div className="w-16 px-1.5 py-1.5 bg-gray-50 border border-gray-300 rounded text-right text-xs text-gray-700">
                            {item.unit_price.toFixed(2)}
                          </div>
                        )}
                        <span className="text-gray-500 text-xs">×</span>
                        {isEditable ? (
                          <DecimalInput
                            value={item.quantity}
                            onChange={(v) => onUpdateOptionItemQuantity(item.id, v)}
                            step="0.01"
                            className="w-16 px-1.5 py-1.5 border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        ) : (
                          <div className="w-16 px-1.5 py-1.5 bg-gray-50 border border-gray-300 rounded text-right text-xs text-gray-700">
                            {item.quantity.toFixed(2)}
                          </div>
                        )}
                        <span className="text-gray-500 text-xs">=</span>
                        <div className="w-20 px-1.5 py-1.5 bg-gray-50 border border-gray-200 rounded text-right text-xs text-gray-700">
                          ¥{calculatedCost.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {isLevelA && canAddAdminOnlyItems && (
                  <button
                    onClick={() => onAddOptionItem(true)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-300 rounded transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    A레벨 전용 항목 추가
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 인건비 */}
        <div className="space-y-3 border-l border-gray-200 pl-5">
          <h4 className="text-sm text-gray-700 mb-3 pb-2 border-b border-gray-200 flex justify-between items-center">
            <span>{t("purchaseOrder.detail.laborCost")}</span>
            <span className="text-lg font-semibold text-orange-700 bg-orange-100 px-3 py-1 rounded">
              ¥{totalLaborCost.toFixed(2)}
            </span>
          </h4>
          <div className="space-y-4">
            {/* 일반 항목 */}
            <div className="space-y-2">
              {!isLevelC && <div className="text-xs font-semibold text-gray-600 mb-2">{t("purchaseOrder.detail.generalItems")}</div>}
              {normalLaborCostItems.map((item) => {
                const calculatedCost = item.unit_price * item.quantity;
                const isEditable = canAddItems;
                return (
                  <div key={item.id} className="space-y-1">
                    {/* 모바일 전용: 두 줄 */}
                    <div className="md:hidden flex flex-col gap-1 rounded border border-gray-200 bg-gray-50/50 p-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isEditable && (
                          <button
                            onClick={() => onRemoveLaborCostItem(item.id)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors shrink-0"
                            title="항목 삭제"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                        {isEditable ? (
                          <input
                            type="text"
                            value={item.name || ''}
                            onChange={(e) => onUpdateLaborCostItemName(item.id, e.target.value)}
                            placeholder={t("purchaseOrder.detail.itemNamePlaceholder")}
                            className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        ) : (
                          <div className="flex-1 min-w-0 px-2 py-1.5 bg-gray-50 border border-gray-300 rounded text-xs text-gray-700 font-medium">
                            {item.name || '항목명'}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap text-xs">
                        <span className="text-gray-500">¥</span>
                        {isEditable ? (
                          <DecimalInput
                            value={item.unit_price}
                            onChange={(v) => onUpdateLaborCostItemUnitPrice(item.id, v)}
                            step="0.01"
                            className="w-16 px-1.5 py-1.5 border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        ) : (
                          <span className="text-gray-700">{item.unit_price.toFixed(2)}</span>
                        )}
                        <span className="text-gray-500">×</span>
                        {isEditable ? (
                          <DecimalInput
                            value={item.quantity}
                            onChange={(v) => onUpdateLaborCostItemQuantity(item.id, v)}
                            step="0.01"
                            className="w-16 px-1.5 py-1.5 border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        ) : (
                          <span className="text-gray-700">{item.quantity.toFixed(2)}</span>
                        )}
                        <span className="text-gray-500">=</span>
                        <span className="font-semibold text-orange-700">¥{calculatedCost.toFixed(2)}</span>
                      </div>
                    </div>
                    {/* 데스크톱 전용: 한 줄 */}
                    <div className="hidden md:flex items-center gap-1.5">
                      {isEditable && (
                        <button
                          onClick={() => onRemoveLaborCostItem(item.id)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                          title="항목 삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                      {isEditable ? (
                        <input
                          type="text"
                          value={item.name || ''}
                          onChange={(e) => onUpdateLaborCostItemName(item.id, e.target.value)}
                          placeholder={t("purchaseOrder.detail.itemNamePlaceholder")}
                          className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      ) : (
                        <div className="flex-1 min-w-0 px-2 py-1.5 bg-gray-50 border border-gray-300 rounded text-xs text-gray-700">
                          {item.name || '항목명'}
                        </div>
                      )}
                      <span className="text-gray-500 text-xs">¥</span>
                      {isEditable ? (
                        <DecimalInput
                          value={item.unit_price}
                          onChange={(v) => onUpdateLaborCostItemUnitPrice(item.id, v)}
                          step="0.01"
                          className="w-16 px-1.5 py-1.5 border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      ) : (
                        <div className="w-16 px-1.5 py-1.5 bg-gray-50 border border-gray-300 rounded text-right text-xs text-gray-700">
                          {item.unit_price.toFixed(2)}
                        </div>
                      )}
                      <span className="text-gray-500 text-xs">×</span>
                      {isEditable ? (
                        <DecimalInput
                          value={item.quantity}
                          onChange={(v) => onUpdateLaborCostItemQuantity(item.id, v)}
                          step="0.01"
                          className="w-16 px-1.5 py-1.5 border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      ) : (
                        <div className="w-16 px-1.5 py-1.5 bg-gray-50 border border-gray-300 rounded text-right text-xs text-gray-700">
                          {item.quantity.toFixed(2)}
                        </div>
                      )}
                      <span className="text-gray-500 text-xs">=</span>
                      <div className="w-20 px-1.5 py-1.5 bg-gray-50 border border-gray-200 rounded text-right text-xs text-gray-700">
                        ¥{calculatedCost.toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })}
              {canAddItems && (
                <button
                  onClick={() => onAddLaborCostItem(false)}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 border border-orange-300 rounded transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  일반 항목 추가
                </button>
              )}
            </div>

              {/* A레벨 전용 영역 (A 레벨과 C0 레벨에서 볼 수 있음) */}
              {(isLevelA || isLevelC) && (
                <div className={`space-y-2 ${isLevelA ? 'pt-2 border-t border-blue-200' : ''}`}>
                  {isLevelA && (
                    <div className="text-xs font-semibold text-blue-600 mb-2 flex items-center gap-1">
                      <span className="text-blue-600 text-xs font-semibold px-1.5 py-0.5 bg-blue-100 rounded">A</span>
                      <span>A 레벨 관리자 전용</span>
                    </div>
                  )}
                  {adminOnlyLaborCostItems.map((item) => {
                    const calculatedCost = item.unit_price * item.quantity;
                    const isEditable = isLevelA && canWrite;
                    return (
                      <div key={item.id} className="space-y-1">
                        {/* 모바일 전용: 두 줄 */}
                        <div className={`md:hidden flex flex-col gap-1 rounded border p-2 ${isLevelA ? 'bg-blue-50 border-blue-200' : 'bg-gray-50/50 border-gray-200'}`}>
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isLevelA && (
                              <span className="text-blue-600 text-xs font-semibold px-1 shrink-0" title="A 레벨 관리자 전용">A</span>
                            )}
                            {isEditable && (
                              <button
                                onClick={() => onRemoveLaborCostItem(item.id)}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors shrink-0"
                                title="항목 삭제"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                            {isEditable ? (
                              <input
                                type="text"
                                value={item.name || ''}
                                onChange={(e) => onUpdateLaborCostItemName(item.id, e.target.value)}
                                placeholder={t("purchaseOrder.detail.itemNamePlaceholder")}
                                className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                            ) : (
                              <div className="flex-1 min-w-0 px-2 py-1.5 bg-gray-50 border border-gray-300 rounded text-xs text-gray-700 font-medium">
                                {item.name || '항목명'}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap text-xs">
                            <span className="text-gray-500">¥</span>
                            {isEditable ? (
                              <DecimalInput
                                value={item.unit_price}
                                onChange={(v) => onUpdateLaborCostItemUnitPrice(item.id, v)}
                                step="0.01"
                                className="w-16 px-1.5 py-1.5 border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                            ) : (
                              <span className="text-gray-700">{item.unit_price.toFixed(2)}</span>
                            )}
                            <span className="text-gray-500">×</span>
                            {isEditable ? (
                              <DecimalInput
                                value={item.quantity}
                                onChange={(v) => onUpdateLaborCostItemQuantity(item.id, v)}
                                step="0.01"
                                className="w-16 px-1.5 py-1.5 border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                            ) : (
                              <span className="text-gray-700">{item.quantity.toFixed(2)}</span>
                            )}
                            <span className="text-gray-500">=</span>
                            <span className="font-semibold text-orange-700">¥{calculatedCost.toFixed(2)}</span>
                          </div>
                        </div>
                        {/* 데스크톱 전용: 한 줄 */}
                        <div className={`hidden md:flex items-center gap-1.5 ${isLevelA ? 'bg-blue-50 border border-blue-200 rounded p-1' : ''}`}>
                          {isLevelA && (
                            <span className="text-blue-600 text-xs font-semibold px-1" title="A 레벨 관리자 전용">A</span>
                          )}
                          {isEditable && (
                            <button
                              onClick={() => onRemoveLaborCostItem(item.id)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                              title="항목 삭제"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                          {isEditable ? (
                            <input
                              type="text"
                              value={item.name || ''}
                              onChange={(e) => onUpdateLaborCostItemName(item.id, e.target.value)}
                              placeholder={t("purchaseOrder.detail.itemNamePlaceholder")}
                              className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          ) : (
                            <div className="flex-1 min-w-0 px-2 py-1.5 bg-gray-50 border border-gray-300 rounded text-xs text-gray-700">
                              {item.name || '항목명'}
                            </div>
                          )}
                          <span className="text-gray-500 text-xs">¥</span>
                          {isEditable ? (
                            <DecimalInput
                              value={item.unit_price}
                              onChange={(v) => onUpdateLaborCostItemUnitPrice(item.id, v)}
                              step="0.01"
                              className="w-16 px-1.5 py-1.5 border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          ) : (
                            <div className="w-16 px-1.5 py-1.5 bg-gray-50 border border-gray-300 rounded text-right text-xs text-gray-700">
                              {item.unit_price.toFixed(2)}
                            </div>
                          )}
                          <span className="text-gray-500 text-xs">×</span>
                          {isEditable ? (
                            <DecimalInput
                              value={item.quantity}
                              onChange={(v) => onUpdateLaborCostItemQuantity(item.id, v)}
                              step="0.01"
                              className="w-16 px-1.5 py-1.5 border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          ) : (
                            <div className="w-16 px-1.5 py-1.5 bg-gray-50 border border-gray-300 rounded text-right text-xs text-gray-700">
                              {item.quantity.toFixed(2)}
                            </div>
                          )}
                          <span className="text-gray-500 text-xs">=</span>
                          <div className="w-20 px-1.5 py-1.5 bg-gray-50 border border-gray-200 rounded text-right text-xs text-gray-700">
                            ¥{calculatedCost.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {isLevelA && canAddAdminOnlyItems && (
                    <button
                      onClick={() => onAddLaborCostItem(true)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-300 rounded transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      A레벨 전용 항목 추가
                    </button>
                  )}
                </div>
              )}
          </div>
        </div>
      </div>

      {/* 최종 결제 금액 */}
      <div className="pt-4 border-t-2 border-gray-300">
        <div className="flex flex-col gap-6 md:gap-8 lg:flex-row lg:items-start lg:gap-8">
          {/* 선금/잔금 정보 */}
          <div className="flex-1 bg-gray-50 rounded-lg p-4 md:p-5 min-w-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* 선금 */}
              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-gray-900 font-semibold">선금</span>
                  <div className="flex items-center gap-2 md:gap-4">
                    <div className="flex items-center gap-2">
                      <DecimalInput
                        value={advancePaymentRate}
                        onChange={onSetAdvancePaymentRate}
                        min={0}
                        max={100}
                        step="1"
                        decimalPlaces={0}
                        disabled={!canEditCostFields}
                        className={`w-20 px-3 py-1.5 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${!canEditCostFields ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-gray-600">
                    선금 지불일자
                  </span>
                  <input
                    type="date"
                    value={advancePaymentDate}
                    onChange={(e) =>
                      onSetAdvancePaymentDate(e.target.value)
                    }
                    disabled={!canWrite}
                    className={`px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${!canWrite ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>

              {/* 잔금 */}
              <div className="space-y-3 border-t border-gray-300 pt-6 md:border-t-0 md:pt-0 md:border-l md:pl-8">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-gray-900 font-semibold">{t("purchaseOrder.detail.balancePayment")}</span>
                  <span className="text-lg font-semibold text-orange-700 bg-orange-100 px-4 py-1.5 rounded">
                    ¥
                    {balancePaymentAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-gray-600">
                    잔금 지불일자
                  </span>
                  <input
                    type="date"
                    value={balancePaymentDate}
                    onChange={(e) =>
                      onSetBalancePaymentDate(e.target.value)
                    }
                    disabled={!canWrite}
                    className={`px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${!canWrite ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 최종 결제 금액 라벨 및 금액 표시 */}
          <div className="flex flex-col items-stretch md:items-end gap-2 shrink-0">
            <span className="text-gray-900 font-semibold whitespace-nowrap">
              최종 결제 금액
            </span>
            <span className="text-xl md:text-2xl font-bold text-purple-700 bg-purple-100 px-4 py-2 md:px-5 md:py-2.5 rounded-lg whitespace-nowrap">
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