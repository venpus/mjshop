import type { FactoryShipment, ReturnExchangeItem } from "../components/tabs/FactoryShippingTab";
import type { LaborCostItem } from "../components/tabs/CostPaymentTab";
import { isNewCommissionCalculationDate } from "./dateUtils";

/**
 * 옵션 항목들의 총 비용을 계산합니다.
 */
export function calculateTotalOptionCost(optionItems: LaborCostItem[]): number {
  return optionItems.reduce((sum, item) => sum + item.cost, 0);
}

/**
 * 인건비 항목들의 총 비용을 계산합니다.
 */
export function calculateTotalLaborCost(laborCostItems: LaborCostItem[]): number {
  return laborCostItems.reduce((sum, item) => sum + item.cost, 0);
}

/**
 * 옵션 항목들의 총 비용을 계산합니다 (A레벨 관리자 전용 항목 제외).
 * 수수료 계산 시 사용됩니다.
 */
export function calculateTotalOptionCostForCommission(optionItems: LaborCostItem[]): number {
  return optionItems
    .filter(item => !item.isAdminOnly)
    .reduce((sum, item) => sum + item.cost, 0);
}

/**
 * 인건비 항목들의 총 비용을 계산합니다 (A레벨 관리자 전용 항목 제외).
 * 수수료 계산 시 사용됩니다.
 */
export function calculateTotalLaborCostForCommission(laborCostItems: LaborCostItem[]): number {
  return laborCostItems
    .filter(item => !item.isAdminOnly)
    .reduce((sum, item) => sum + item.cost, 0);
}

/**
 * 총 출고 수량을 계산합니다.
 */
export function calculateTotalShippedQuantity(factoryShipments: FactoryShipment[]): number {
  return factoryShipments.reduce((sum, shipment) => sum + shipment.quantity, 0);
}

/**
 * 총 반품/교환 수량을 계산합니다.
 */
export function calculateTotalReturnQuantity(returnExchangeItems: ReturnExchangeItem[]): number {
  return returnExchangeItems.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * 총 입고 수량을 계산합니다. (출고 수량 - 반품 수량)
 */
export function calculateTotalReceivedQuantity(
  factoryShipments: FactoryShipment[],
  returnExchangeItems: ReturnExchangeItem[]
): number {
  const totalShipped = calculateTotalShippedQuantity(factoryShipments);
  const totalReturn = calculateTotalReturnQuantity(returnExchangeItems);
  return totalShipped - totalReturn;
}

/**
 * 업체 출고 상태를 계산합니다.
 */
export function calculateFactoryStatus(
  factoryShipments: FactoryShipment[],
  returnExchangeItems: ReturnExchangeItem[],
  orderQuantity: number
): "수령완료" | "배송중" | "준비중" {
  const totalReceived = calculateTotalReceivedQuantity(factoryShipments, returnExchangeItems);
  
  if (totalReceived >= orderQuantity) {
    return "수령완료";
  } else if (factoryShipments.length > 0) {
    return "배송중";
  } else {
    return "준비중";
  }
}

/**
 * 작업 상태를 계산합니다.
 */
export function calculateWorkStatus(
  workStartDate: string | null | undefined,
  workEndDate: string | null | undefined
): "완료" | "작업중" | "작업대기" {
  if (workEndDate) {
    return "완료";
  } else if (workStartDate) {
    return "작업중";
  } else {
    return "작업대기";
  }
}

/**
 * 업체 출고 상태를 계산합니다 (목록용 - 수량 기반)
 * factory_shipped_quantity와 ordered_quantity를 비교하여 상태를 결정합니다.
 */
export function calculateFactoryStatusFromQuantity(
  factoryShippedQuantity: number,
  orderedQuantity: number
): "수령완료" | "배송중" | "출고대기" {
  if (factoryShippedQuantity >= orderedQuantity && factoryShippedQuantity > 0) {
    return "수령완료";
  } else if (factoryShippedQuantity > 0) {
    return "배송중";
  } else {
    return "출고대기";
  }
}

/**
 * 기본 비용 총액을 계산합니다.
 * 2025-01-06 이전: 기본 비용 = 발주단가 x (1 + 수수료율) x 수량
 * 2025-01-06 이후: 기본 비용 = 발주단가 x 수량 (수수료는 별도 계산)
 * 발주단가 = 기본단가 + 추가단가
 */
export function calculateBasicCostTotal(
  unitPrice: number,
  quantity: number,
  commissionRate: number,
  backMargin: number,
  orderDate?: Date | string | null
): number {
  const orderUnitPrice = unitPrice + backMargin; // 발주단가
  
  // 2025-01-06 이후 발주는 수수료를 별도 계산하므로 기본 비용에는 수수료 미포함
  if (orderDate && isNewCommissionCalculationDate(orderDate)) {
    return orderUnitPrice * quantity;
  }
  
  // 기존 방식: 수수료 포함
  return orderUnitPrice * quantity * (1 + commissionRate / 100);
}

/**
 * 수수료 금액을 계산합니다.
 * 2025-01-06 이전: 수수료 금액 = 발주단가 x 수량 x 수수료율
 * 2025-01-06 이후: 수수료 금액 = ((발주단가 x 수량) + 포장 및 가공 부자재 총계 + 인건비 총계) x 수수료율
 * 단, A레벨 관리자 전용 항목은 수수료 계산에서 제외됩니다.
 * 발주단가 = 기본단가 + 추가단가
 */
export function calculateCommissionAmount(
  unitPrice: number,
  quantity: number,
  commissionRate: number,
  backMargin: number,
  orderDate?: Date | string | null,
  totalOptionCost: number = 0,
  totalLaborCost: number = 0,
  optionItems?: LaborCostItem[],
  laborCostItems?: LaborCostItem[]
): number {
  const orderUnitPrice = unitPrice + backMargin; // 발주단가
  const baseAmount = orderUnitPrice * quantity;
  
  // 2025-01-06 이후 발주는 옵션비용과 인건비를 포함하여 수수료 계산
  if (orderDate && isNewCommissionCalculationDate(orderDate)) {
    // A레벨 관리자 전용 항목 제외한 옵션비용과 인건비 계산
    let optionCostForCommission = totalOptionCost;
    let laborCostForCommission = totalLaborCost;
    
    if (optionItems) {
      optionCostForCommission = calculateTotalOptionCostForCommission(optionItems);
    }
    if (laborCostItems) {
      laborCostForCommission = calculateTotalLaborCostForCommission(laborCostItems);
    }
    
    return (baseAmount + optionCostForCommission + laborCostForCommission) * (commissionRate / 100);
  }
  
  // 기존 방식: 발주단가 x 수량 x 수수료율
  return baseAmount * (commissionRate / 100);
}

/**
 * 배송비 총액을 계산합니다.
 * 업체 배송비 + 창고 배송비 (패킹리스트 배송비는 제외)
 */
export function calculateShippingCostTotal(
  shippingCost: number,
  warehouseShippingCost: number
): number {
  return shippingCost + warehouseShippingCost;
}

/**
 * 최종 결제 금액을 계산합니다.
 * 2025-01-06 이전: 기본비용(수수료 포함) + 운송비 + 옵션비용 + 인건비
 * 2025-01-06 이후: 기본비용(수수료 미포함) + 수수료 + 운송비 + 옵션비용 + 인건비
 * 패킹리스트 배송비는 제외 (별도 관리)
 */
export function calculateFinalPaymentAmount(
  basicCostTotal: number,
  shippingCostTotal: number,
  totalOptionCost: number,
  totalLaborCost: number,
  commissionAmount: number = 0,
  orderDate?: Date | string | null
): number {
  // 2025-01-06 이후 발주는 수수료를 별도로 더함
  if (orderDate && isNewCommissionCalculationDate(orderDate)) {
    return basicCostTotal + commissionAmount + shippingCostTotal + totalOptionCost + totalLaborCost;
  }
  
  // 기존 방식: basicCostTotal에 이미 수수료가 포함되어 있음
  return basicCostTotal + shippingCostTotal + totalOptionCost + totalLaborCost;
}

/**
 * 최종 예상 단가를 계산합니다.
 * (최종 결제 금액 + 패킹리스트 배송비) / 수량
 * 패킹리스트 배송비는 최종 예상 단가 계산에만 포함 (최종 결제 금액에는 제외)
 */
export function calculateExpectedFinalUnitPrice(
  finalPaymentAmount: number,
  packingListShippingCost: number,
  quantity: number
): number {
  return quantity > 0 ? (finalPaymentAmount + packingListShippingCost) / quantity : 0;
}

/**
 * 패킹리스트 배송비를 발주 수량 기준으로 계산합니다.
 * unit_shipping_cost는 출고 수량 기준 평균 배송비이므로,
 * 발주 수량 × 단위당 배송비로 총 예상 배송비를 계산합니다.
 * (미출고 수량에 대해서도 동일한 평균 단가를 적용)
 */
export function calculatePackingListShippingCost(
  unitShippingCost: number,
  orderedQuantity: number
): number {
  return unitShippingCost * orderedQuantity;
}

/**
 * 선금 금액을 계산합니다.
 * 선금 = 발주단가 * 수량 * (선금 비율 / 100)
 * 발주단가 = 기본단가 + 백마진
 */
export function calculateAdvancePaymentAmount(
  unitPrice: number,
  quantity: number,
  advancePaymentRate: number,
  backMargin: number = 0
): number {
  const orderUnitPrice = unitPrice + backMargin; // 발주단가
  return orderUnitPrice * quantity * (advancePaymentRate / 100);
}

/**
 * 잔금 금액을 계산합니다.
 */
export function calculateBalancePaymentAmount(
  finalPaymentAmount: number,
  advancePaymentAmount: number
): number {
  return finalPaymentAmount - advancePaymentAmount;
}

/**
 * 배송 상태를 계산합니다.
 * 패킹리스트 정보를 기반으로 배송 상태를 결정합니다.
 * 
 * @param hasPackingList 패킹리스트 존재 여부 (shippedQuantity > 0이면 패킹리스트 존재)
 * @param warehouseArrivalDate 물류창고 도착일 (있으면 문자열, 없으면 null/undefined)
 * @param hasKoreaArrival 한국도착일 존재 여부
 * @param defaultDeliveryStatus DB에 저장된 기본 배송 상태 (패킹리스트가 없을 때 사용)
 * @returns 계산된 배송 상태
 */
export function calculateDeliveryStatus(
  hasPackingList: boolean = false,
  warehouseArrivalDate?: string | null,
  hasKoreaArrival: boolean = false,
  defaultDeliveryStatus: string = '대기중'
): string {
  // 패킹리스트가 없으면 "대기중"
  if (!hasPackingList) {
    return defaultDeliveryStatus;
  }
  
  // 패킹리스트가 있는 경우
  // 우선순위 1: 한국도착일이 있으면 "한국도착"
  if (hasKoreaArrival) {
    return '한국도착';
  }
  
  // 우선순위 2: 물류창고 도착일이 있으면 "배송중"
  if (warehouseArrivalDate && warehouseArrivalDate.trim() !== '') {
    return '배송중';
  }
  
  // 우선순위 3: 물류창고 도착일이 없으면 "내륙운송중"
  // (물류창고 도착일이 없고 한국도착일도 없는 경우)
  return '내륙운송중';
}
