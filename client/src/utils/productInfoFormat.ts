import {
  computeProductFinalUnitCost,
  convertFinalUnitCostToKrw,
} from './productCostCalculations';

export interface ProductInfoFields {
  price: number;
  logisticsCost: number;
  weight: string;
  size: string;
  hasTag: boolean;
  stock: number;
  deliveryDays: number | null;
  tagAddonEnabled: boolean;
  tagAddonPrice: number | null;
  packagingAddonEnabled: boolean;
  packagingAddonPrice: number | null;
  finalUnitCost: number | null;
  laborCost?: number;
}

export function resolveProductFinalUnitCost(product: ProductInfoFields): number {
  if (product.finalUnitCost != null) {
    return product.finalUnitCost;
  }
  return computeProductFinalUnitCost({
    price: product.price,
    logisticsCost: product.logisticsCost,
    tagAddonEnabled: product.tagAddonEnabled,
    tagAddonPrice: product.tagAddonPrice,
    packagingAddonEnabled: product.packagingAddonEnabled,
    packagingAddonPrice: product.packagingAddonPrice,
    laborCost: product.laborCost ?? 0,
  });
}

export function formatHasTag(hasTag: boolean): string {
  return hasTag ? '있음' : '없음';
}

export function formatAddonWork(
  enabled: boolean,
  price: number | null | undefined
): string {
  if (!enabled) return '없음';
  if (price != null && price > 0) {
    return `¥${price.toLocaleString()}`;
  }
  return '있음';
}

export function formatWeight(weight: string): string {
  const trimmed = weight.trim();
  if (!trimmed) return '-';
  return trimmed.endsWith('g') ? trimmed : `${trimmed}g`;
}

export function formatSize(size: string): string {
  const trimmed = size.trim();
  if (!trimmed) return '-';
  return trimmed.endsWith('cm') ? trimmed : `${trimmed}cm`;
}

export function formatDeliveryDays(days: number | null): string {
  if (days == null) return '-';
  return `${days}일`;
}

export function formatProductInfoClipboardText(product: ProductInfoFields): string {
  const finalCny = resolveProductFinalUnitCost(product);
  const finalKrw = convertFinalUnitCostToKrw(finalCny);

  return [
    `제품가: ¥${product.price.toLocaleString()}`,
    `물류비: ¥${product.logisticsCost.toLocaleString()}`,
    `무게: ${formatWeight(product.weight)}`,
    `사이즈: ${formatSize(product.size)}`,
    `택 유무: ${formatHasTag(product.hasTag)}`,
    `재고 수량: ${product.stock.toLocaleString()}`,
    `납기일: ${formatDeliveryDays(product.deliveryDays)}`,
    `택 추가작업: ${formatAddonWork(product.tagAddonEnabled, product.tagAddonPrice)}`,
    `재포장 작업: ${formatAddonWork(product.packagingAddonEnabled, product.packagingAddonPrice)}`,
    `최종원가(위안): ¥${finalCny.toLocaleString()}`,
    `최종원가(한화): ₩${finalKrw.toLocaleString()}`,
  ].join('\n');
}

export const PRODUCT_INFO_LABELS: Array<{
  key: keyof ProductInfoFields | 'finalCny' | 'finalKrw';
  label: string;
}> = [
  { key: 'price', label: '제품가' },
  { key: 'logisticsCost', label: '물류비' },
  { key: 'weight', label: '무게' },
  { key: 'size', label: '사이즈' },
  { key: 'hasTag', label: '택 유무' },
  { key: 'stock', label: '재고 수량' },
  { key: 'deliveryDays', label: '납기일' },
  { key: 'tagAddonEnabled', label: '택 추가작업' },
  { key: 'packagingAddonEnabled', label: '재포장 작업' },
  { key: 'finalCny', label: '최종원가(위안)' },
  { key: 'finalKrw', label: '최종원가(한화)' },
];

export function getProductInfoDisplayValue(
  product: ProductInfoFields,
  key: (typeof PRODUCT_INFO_LABELS)[number]['key']
): string {
  const finalCny = resolveProductFinalUnitCost(product);
  const finalKrw = convertFinalUnitCostToKrw(finalCny);

  switch (key) {
    case 'price':
      return `¥${product.price.toLocaleString()}`;
    case 'logisticsCost':
      return `¥${product.logisticsCost.toLocaleString()}`;
    case 'weight':
      return formatWeight(product.weight);
    case 'size':
      return formatSize(product.size);
    case 'hasTag':
      return formatHasTag(product.hasTag);
    case 'stock':
      return product.stock.toLocaleString();
    case 'deliveryDays':
      return formatDeliveryDays(product.deliveryDays);
    case 'tagAddonEnabled':
      return formatAddonWork(product.tagAddonEnabled, product.tagAddonPrice);
    case 'packagingAddonEnabled':
      return formatAddonWork(product.packagingAddonEnabled, product.packagingAddonPrice);
    case 'finalCny':
      return `¥${finalCny.toLocaleString()}`;
    case 'finalKrw':
      return `₩${finalKrw.toLocaleString()}`;
    default:
      return '-';
  }
}
