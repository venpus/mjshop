export const SHOP_COST_EXCHANGE_RATE = 255;
export const SHOP_COST_LOGISTICS_EXCHANGE_RATE = 225;
export const SHOP_COST_INDEPENDENT_PACKING_CNY = 0.2;export const SHOP_COST_BAG_FILLER_CNY = 0.1;
export const SHOP_COST_WEIGHT_RATE_KRW = 0.031;

export interface ShopCostCalculatorInput {
  unitCostsCny: string[];
  independentPacking: boolean;
  bagFiller: boolean;
  weightGrams: string;
}

export interface ShopCostCalculatorResult {
  unitCostsSumCny: number;
  packagingAddCny: number;
  totalCny: number;
  cnyToKrw: number;
  logisticsFeeKrw: number;
  totalKrw: number;
  hasInput: boolean;
}

function parseCny(value: string): number {
  const parsed = parseFloat(value.replace(/,/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function parseWeight(value: string): number {
  const parsed = parseFloat(value.replace(/,/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function calculateShopCost(input: ShopCostCalculatorInput): ShopCostCalculatorResult {
  const unitCostsSumCny = input.unitCostsCny.reduce((sum, value) => sum + parseCny(value), 0);
  const packagingAddCny =
    (input.independentPacking ? SHOP_COST_INDEPENDENT_PACKING_CNY : 0) +
    (input.bagFiller ? SHOP_COST_BAG_FILLER_CNY : 0);
  const totalCny = unitCostsSumCny + packagingAddCny;
  const cnyToKrw = totalCny * SHOP_COST_EXCHANGE_RATE;
  const logisticsFeeKrw =
    parseWeight(input.weightGrams) *
    SHOP_COST_WEIGHT_RATE_KRW *
    SHOP_COST_LOGISTICS_EXCHANGE_RATE;  const totalKrw = cnyToKrw + logisticsFeeKrw;

  return {
    unitCostsSumCny,
    packagingAddCny,
    totalCny,
    cnyToKrw,
    logisticsFeeKrw,
    totalKrw,
    hasInput: totalCny > 0 || parseWeight(input.weightGrams) > 0,
  };
}

export function formatShopCostCny(value: number): string {
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}¥`;
}

export function formatShopCostKrw(value: number): string {
  return `${Math.round(value).toLocaleString()}원`;
}
