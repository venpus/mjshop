export interface ProductCostInput {
  price: number;
  logisticsCost?: number;
  tagAddonEnabled?: boolean;
  tagAddonPrice?: number | null;
  packagingAddonEnabled?: boolean;
  packagingAddonPrice?: number | null;
  laborCost?: number;
}

/** 물류비 산출용 g당 요율 (CNY) */
export const LOGISTICS_COST_RATE_PER_GRAM = 0.031;

/** 최종 원가 한화 환산 (CNY → KRW) */
export const CNY_TO_KRW_RATE = 225;

export function convertFinalUnitCostToKrw(cnyAmount: number): number {
  return Math.round(cnyAmount * CNY_TO_KRW_RATE);
}

/**
 * 중량(g) + 5 후 일의 자리 조정
 * - 일의 자리 ≤ 5: 해당 십의 자리 + 5 (예: 23 → 25)
 * - 일의 자리 > 5: 십의 자리 올림 (예: 26 → 30)
 */
export function roundAdjustedWeightForLogistics(weightGrams: number): number {
  const adjusted = weightGrams + 5;
  const ones = adjusted % 10;
  const tens = Math.floor(adjusted / 10) * 10;

  if (ones <= 5) {
    return tens + 5;
  }
  return tens + 10;
}

/** 중량(g)으로 물류비(CNY) 계산. 유효하지 않은 중량이면 null */
export function computeLogisticsCostFromWeight(weightGrams: number): number | null {
  if (!Number.isFinite(weightGrams) || weightGrams < 0) {
    return null;
  }

  const billableWeight = roundAdjustedWeightForLogistics(weightGrams);
  return Math.round(billableWeight * LOGISTICS_COST_RATE_PER_GRAM * 100) / 100;
}

export function computeProductFinalUnitCost(input: ProductCostInput): number {
  const base = Number(input.price) || 0;
  const logistics = Number(input.logisticsCost) || 0;
  const tagAddon =
    input.tagAddonEnabled && input.tagAddonPrice != null
      ? Number(input.tagAddonPrice) || 0
      : 0;
  const packagingAddon =
    input.packagingAddonEnabled && input.packagingAddonPrice != null
      ? Number(input.packagingAddonPrice) || 0
      : 0;
  const labor = Number(input.laborCost) || 0;

  return Math.round((base + logistics + tagAddon + packagingAddon + labor) * 100) / 100;
}
