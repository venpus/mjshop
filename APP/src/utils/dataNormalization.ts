/**
 * 데이터 정규화 유틸리티
 * 모든 필드를 일관되게 정규화하여 비교 오류를 방지합니다.
 */

/**
 * 날짜 문자열을 YYYY-MM-DD 형식으로 정규화합니다.
 * ISO 형식(2024-01-04T00:00:00.000Z)이나 DATETIME 형식을 처리합니다.
 * 타임존 변환 없이 날짜 부분만 추출하여 하루 차이 문제를 방지합니다.
 */
export function normalizeDateValue(date: string | null | undefined): string {
  if (!date) return '';
  
  // 이미 YYYY-MM-DD 형식이면 그대로 반환
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  // ISO 형식 (2024-01-04T00:00:00.000Z) 또는 DATETIME 형식 처리
  // 타임존 변환 없이 날짜 부분만 추출
  if (date.includes('T')) {
    // ISO 형식: 날짜 부분만 추출 (T 이전 부분)
    const datePart = date.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      return datePart;
    }
  }
  
  // DATETIME 형식 (2024-01-04 00:00:00) 처리
  if (date.includes(' ')) {
    const datePart = date.split(' ')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      return datePart;
    }
  }
  
  // 다른 형식인 경우 빈 문자열 반환
  return '';
}

/**
 * 숫자 필드를 정규화합니다.
 * null, undefined, NaN을 0으로 변환합니다.
 */
export function normalizeNumber(value: number | null | undefined): number {
  if (value === null || value === undefined || isNaN(value)) {
    return 0;
  }
  return value;
}

/**
 * 문자열 필드를 정규화합니다.
 * null, undefined를 빈 문자열로 변환합니다.
 */
export function normalizeString(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

/**
 * 날짜 필드를 정규화합니다.
 * normalizeDateValue를 사용하여 일관된 형식으로 변환합니다.
 */
export function normalizeDate(date: string | null | undefined): string {
  return normalizeDateValue(date);
}

/**
 * 불린 필드를 정규화합니다.
 * null, undefined를 false로 변환합니다.
 */
export function normalizeBoolean(value: boolean | null | undefined): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  return Boolean(value);
}

/**
 * 발주 폼 데이터를 정규화합니다.
 * 모든 필드를 일관된 형식으로 변환하여 비교 오류를 방지합니다.
 */
export interface PurchaseOrderFormDataRaw {
  unitPrice?: number | null;
  backMargin?: number | null;
  quantity?: number | null;
  shippingCost?: number | null;
  warehouseShippingCost?: number | null;
  commissionRate?: number | null;
  commissionType?: string | null;
  advancePaymentRate?: number | null;
  advancePaymentDate?: string | null;
  balancePaymentDate?: string | null;
  packaging?: number | null;
  orderDate?: string | null;
  deliveryDate?: string | null;
  workStartDate?: string | null;
  workEndDate?: string | null;
  isOrderConfirmed?: boolean | null;
  productName?: string | null;
  productSize?: string | null;
  productWeight?: string | null;
  productPackagingSize?: string | null;
}

export interface PurchaseOrderFormDataNormalized {
  unitPrice: number;
  backMargin: number;
  quantity: number;
  shippingCost: number;
  warehouseShippingCost: number;
  commissionRate: number;
  commissionType: string;
  advancePaymentRate: number;
  advancePaymentDate: string;
  balancePaymentDate: string;
  packaging: number;
  orderDate: string;
  deliveryDate: string;
  workStartDate: string;
  workEndDate: string;
  isOrderConfirmed: boolean;
  productName: string;
  productSize: string;
  productWeight: string;
  productPackagingSize: string;
}

/**
 * 발주 폼 데이터를 정규화합니다.
 */
export function normalizePurchaseOrderFormData(
  data: PurchaseOrderFormDataRaw
): PurchaseOrderFormDataNormalized {
  return {
    unitPrice: normalizeNumber(data.unitPrice),
    backMargin: normalizeNumber(data.backMargin),
    quantity: normalizeNumber(data.quantity),
    shippingCost: normalizeNumber(data.shippingCost),
    warehouseShippingCost: normalizeNumber(data.warehouseShippingCost),
    commissionRate: normalizeNumber(data.commissionRate),
    commissionType: normalizeString(data.commissionType),
    advancePaymentRate: normalizeNumber(data.advancePaymentRate),
    advancePaymentDate: normalizeDate(data.advancePaymentDate),
    balancePaymentDate: normalizeDate(data.balancePaymentDate),
    packaging: normalizeNumber(data.packaging),
    orderDate: normalizeDate(data.orderDate),
    deliveryDate: normalizeDate(data.deliveryDate),
    workStartDate: normalizeDate(data.workStartDate),
    workEndDate: normalizeDate(data.workEndDate),
    isOrderConfirmed: normalizeBoolean(data.isOrderConfirmed),
    productName: normalizeString(data.productName),
    productSize: normalizeString(data.productSize),
    productWeight: normalizeString(data.productWeight),
    productPackagingSize: normalizeString(data.packaging?.toString()),
  };
}

/**
 * 두 정규화된 폼 데이터가 동일한지 비교합니다.
 */
export function areFormDataEqual(
  a: PurchaseOrderFormDataNormalized,
  b: PurchaseOrderFormDataNormalized
): boolean {
  return (
    a.unitPrice === b.unitPrice &&
    a.backMargin === b.backMargin &&
    a.quantity === b.quantity &&
    a.shippingCost === b.shippingCost &&
    a.warehouseShippingCost === b.warehouseShippingCost &&
    a.commissionRate === b.commissionRate &&
    a.commissionType === b.commissionType &&
    a.advancePaymentRate === b.advancePaymentRate &&
    a.advancePaymentDate === b.advancePaymentDate &&
    a.balancePaymentDate === b.balancePaymentDate &&
    a.packaging === b.packaging &&
    a.orderDate === b.orderDate &&
    a.deliveryDate === b.deliveryDate &&
    a.workStartDate === b.workStartDate &&
    a.workEndDate === b.workEndDate &&
    a.isOrderConfirmed === b.isOrderConfirmed &&
    a.productName === b.productName &&
    a.productSize === b.productSize &&
    a.productWeight === b.productWeight &&
    a.productPackagingSize === b.productPackagingSize
  );
}

