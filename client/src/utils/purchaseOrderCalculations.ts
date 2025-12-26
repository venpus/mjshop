import type { FactoryShipment, ReturnExchangeItem } from "../components/tabs/FactoryShippingTab";
import type { LaborCostItem } from "../components/tabs/CostPaymentTab";

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
  workStartDate: string,
  workEndDate: string
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
 * 기본 비용 총액을 계산합니다.
 * 기본 비용 = 발주단가 x (1 + 수수료율) x 수량
 * 발주단가 = 기본단가 + 추가단가
 */
export function calculateBasicCostTotal(
  unitPrice: number,
  quantity: number,
  commissionRate: number,
  backMargin: number
): number {
  const orderUnitPrice = unitPrice + backMargin; // 발주단가
  return orderUnitPrice * quantity * (1 + commissionRate / 100);
}

/**
 * 수수료 금액을 계산합니다.
 * 수수료 금액 = 발주단가 x 수량 x 수수료율
 * 발주단가 = 기본단가 + 추가단가
 */
export function calculateCommissionAmount(
  unitPrice: number,
  quantity: number,
  commissionRate: number,
  backMargin: number
): number {
  const orderUnitPrice = unitPrice + backMargin; // 발주단가
  return orderUnitPrice * quantity * (commissionRate / 100);
}

/**
 * 배송비 총액을 계산합니다.
 */
export function calculateShippingCostTotal(
  shippingCost: number,
  warehouseShippingCost: number
): number {
  return shippingCost + warehouseShippingCost;
}

/**
 * 최종 결제 금액을 계산합니다.
 */
export function calculateFinalPaymentAmount(
  basicCostTotal: number,
  shippingCostTotal: number,
  totalOptionCost: number,
  totalLaborCost: number
): number {
  return basicCostTotal + shippingCostTotal + totalOptionCost + totalLaborCost;
}

/**
 * 최종 예상 단가를 계산합니다. (최종 결제 금액 / 수량)
 */
export function calculateExpectedFinalUnitPrice(
  finalPaymentAmount: number,
  quantity: number
): number {
  return quantity > 0 ? finalPaymentAmount / quantity : 0;
}

/**
 * 선금 금액을 계산합니다.
 */
export function calculateAdvancePaymentAmount(
  unitPrice: number,
  quantity: number,
  advancePaymentRate: number
): number {
  return unitPrice * quantity * (advancePaymentRate / 100);
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

