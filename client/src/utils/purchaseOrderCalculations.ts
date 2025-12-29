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
 * 기존 배송비(shippingCost, warehouseShippingCost) + 패킹리스트 배송비
 */
export function calculateShippingCostTotal(
  shippingCost: number,
  warehouseShippingCost: number,
  packingListShippingCost: number = 0 // 패킹리스트에서 계산된 배송비 (발주 수량 × 단위당 배송비)
): number {
  return shippingCost + warehouseShippingCost + packingListShippingCost;
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
 * 패킹리스트 배송비를 포함한 최종 단가
 */
export function calculateExpectedFinalUnitPrice(
  finalPaymentAmount: number,
  quantity: number
): number {
  return quantity > 0 ? finalPaymentAmount / quantity : 0;
}

/**
 * 패킹리스트 배송비를 발주 수량 기준으로 계산합니다.
 * unit_shipping_cost는 이미 발주 수량 기준으로 계산되어 있으므로
 * 발주 수량 × 단위당 배송비로 총 배송비를 계산합니다.
 */
export function calculatePackingListShippingCost(
  unitShippingCost: number,
  orderedQuantity: number
): number {
  return unitShippingCost * orderedQuantity;
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

/**
 * 배송 상태를 계산합니다.
 * 패킹리스트 정보를 기반으로 배송 상태를 결정합니다.
 * 
 * @param shippedQuantity 패킹리스트 출고 수량
 * @param shippingQuantity 배송중 수량 (패킹리스트 출고 수량 - 한국도착 수량)
 * @param defaultDeliveryStatus DB에 저장된 기본 배송 상태
 * @returns 계산된 배송 상태
 */
export function calculateDeliveryStatus(
  shippedQuantity: number = 0,
  shippingQuantity: number = 0,
  defaultDeliveryStatus: string = '대기중'
): string {
  // 배송중 수량이 있으면 아직 도착하지 않은 것이므로 '배송중'
  if (shippingQuantity > 0) {
    return '배송중';
  }
  
  // 패킹리스트 출고 수량이 있고, 배송중 수량이 없으면 모두 도착한 것이므로 '한국도착'
  if (shippedQuantity > 0 && shippingQuantity === 0) {
    return '한국도착';
  }
  
  // 그 외에는 DB의 기본 배송 상태 사용
  return defaultDeliveryStatus;
}
