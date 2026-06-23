export interface ProductCostInput {
  price: number;
  logistics_cost?: number;
  tag_addon_enabled?: boolean;
  tag_addon_price?: number | null;
  packaging_addon_enabled?: boolean;
  packaging_addon_price?: number | null;
  labor_cost?: number;
}

/** 물류비 산출용 g당 요율 (CNY) */
export const LOGISTICS_COST_RATE_PER_GRAM = 0.031;

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
  const logistics = Number(input.logistics_cost) || 0;
  const tagAddon =
    input.tag_addon_enabled && input.tag_addon_price != null
      ? Number(input.tag_addon_price) || 0
      : 0;
  const packagingAddon =
    input.packaging_addon_enabled && input.packaging_addon_price != null
      ? Number(input.packaging_addon_price) || 0
      : 0;
  const labor = Number(input.labor_cost) || 0;

  return Math.round((base + logistics + tagAddon + packagingAddon + labor) * 100) / 100;
}
