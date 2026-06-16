import type { ShopOrder } from '../api/shopOrderApi';
import { buildShopOrderLineListRows } from './shopOrderListExport';
import { formatLineOrderRef } from './shopOrderLineListUtils';

export const LOGISTICS_FEE_PER_BOX_KRW = 1200;
export const WK_PROFIT_SHARE_RATE = 0.6;
export const INVENTIO_PROFIT_SHARE_RATE = 0.4;

export interface PartnerProfitShares {
  wkProfitAmount: number | null;
  inventioProfitAmount: number | null;
}

export interface SalesSettlementRow {
  rowKey: string;
  lineId: string;
  shopOrderId: string;
  isLegacyLine: boolean;
  isReservation: boolean;
  lineOrderNumber: string | null;
  orderNumber: string;
  lineIndex: number;
  companyName: string | null;
  productName: string;
  orderDate: string | null;
  orderBoxCount: number;
  shipmentBoxCount: number;
  lineQuantity: number;
  unitCostCny: number | null;
  cnyExchangeRate: number | null;
  salesAmountExVat: number | null;
  vatAmount: number | null;
  deliveryFee: number | null;
  logisticsFee: number;
  costAmountKrw: number | null;
  profitAmount: number | null;
  wkProfitAmount: number | null;
  inventioProfitAmount: number | null;
  wkSettlementPaid: boolean;
  inventioSettlementPaid: boolean;
  logisticsFeePaid: boolean;
  logisticsFeePaidAt: string | null;
  wkSettlementPaidAt: string | null;
  inventioSettlementPaidAt: string | null;
}

export function parseCnyExchangeRateInput(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parsed = parseFloat(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function buildShipmentBoxInputsFromOrders(orders: ShopOrder[]): Record<string, string> {
  const inputs: Record<string, string> = {};

  for (const order of orders) {
    for (const line of order.lines) {
      const rowKey = `${order.id}:${line.id}`;
      inputs[rowKey] = line.shipmentBoxCount != null ? String(line.shipmentBoxCount) : '';
    }
  }

  return inputs;
}

export function parseShipmentBoxCountInput(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parsed = parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export function resolveShipmentBoxCount(
  rowKey: string,
  lineShipmentBoxCount: number | null,
  shipmentBoxCountsByRowKey: Record<string, number | null>
): number {
  const fromInput = shipmentBoxCountsByRowKey[rowKey];
  if (fromInput != null) return fromInput;
  if (lineShipmentBoxCount != null) return lineShipmentBoxCount;
  return 0;
}

export function formatSettlementPaidDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const datePart = value.includes('T') ? value.split('T')[0] : value.slice(0, 10);
  return datePart || null;
}

export function buildExchangeRateInputsFromOrders(orders: ShopOrder[]): Record<string, string> {
  const inputs: Record<string, string> = {};

  for (const order of orders) {
    for (const line of order.lines) {
      const rowKey = `${order.id}:${line.id}`;
      inputs[rowKey] = line.cnyExchangeRate != null ? String(line.cnyExchangeRate) : '';
    }
  }

  return inputs;
}

export function calculateLineQuantity(orderBoxCount: number, quantityPerBox: number): number {
  return orderBoxCount * quantityPerBox;
}

export function calculateLogisticsFee(orderBoxCount: number): number {
  return orderBoxCount * LOGISTICS_FEE_PER_BOX_KRW;
}

export function calculateCostAmountKrw(
  unitCostCny: number | null,
  lineQuantity: number,
  cnyExchangeRate: number | null
): number | null {
  if (unitCostCny == null || unitCostCny <= 0) return null;
  if (cnyExchangeRate == null || cnyExchangeRate <= 0) return null;
  return Math.round(unitCostCny * lineQuantity * cnyExchangeRate);
}

export function calculateProfitAmount(
  salesAmountExVat: number | null,
  deliveryFee: number | null,
  logisticsFee: number,
  costAmountKrw: number | null
): number | null {
  if (salesAmountExVat == null) return null;
  if (costAmountKrw == null) return null;
  return salesAmountExVat + (deliveryFee ?? 0) - logisticsFee - costAmountKrw;
}

export function calculatePartnerProfitShares(profitAmount: number | null): PartnerProfitShares {
  if (profitAmount == null) {
    return { wkProfitAmount: null, inventioProfitAmount: null };
  }

  const wkProfitAmount = Math.round(profitAmount * WK_PROFIT_SHARE_RATE);
  const inventioProfitAmount = profitAmount - wkProfitAmount;

  return { wkProfitAmount, inventioProfitAmount };
}

export function formatSalesSettlementOrderRef(row: Pick<
  SalesSettlementRow,
  'lineOrderNumber' | 'orderNumber' | 'lineIndex' | 'isReservation'
>): string {
  return formatLineOrderRef(
    row.lineOrderNumber,
    row.orderNumber,
    row.lineIndex,
    row.isReservation ? '예약' : undefined
  );
}

function buildLineIndexMaps(orders: ShopOrder[]): {
  orderLineIndexByKey: Map<string, number>;
  reservationLineIndexByKey: Map<string, number>;
} {
  const orderLineIndexByKey = new Map<string, number>();
  const reservationLineIndexByKey = new Map<string, number>();

  for (const order of orders) {
    let orderIndex = 0;
    let reservationIndex = 0;

    for (const line of order.lines) {
      const rowKey = `${order.id}:${line.id}`;
      if (line.isReservation) {
        reservationIndex += 1;
        reservationLineIndexByKey.set(rowKey, reservationIndex);
      } else {
        orderIndex += 1;
        orderLineIndexByKey.set(rowKey, orderIndex);
      }
    }
  }

  return { orderLineIndexByKey, reservationLineIndexByKey };
}

export function buildSalesSettlementRows(
  orders: ShopOrder[],
  exchangeRatesByRowKey: Record<string, number | null>,
  shipmentBoxCountsByRowKey: Record<string, number | null>
): SalesSettlementRow[] {
  const lineRows = buildShopOrderLineListRows(orders);
  const orderById = new Map(orders.map((order) => [order.id, order]));
  const { orderLineIndexByKey, reservationLineIndexByKey } = buildLineIndexMaps(orders);

  return lineRows.map((row) => {
    const order = orderById.get(row.shopOrderId);
    const isReservation = row.line.isReservation;
    const lineIndex = isReservation
      ? (reservationLineIndexByKey.get(row.rowKey) ?? row.lineIndex)
      : (orderLineIndexByKey.get(row.rowKey) ?? row.lineIndex);
    const unitCostCny = order?.unitPrice ?? null;
    const lineQuantity = calculateLineQuantity(row.line.orderBoxCount, row.line.quantityPerBox);
    const salesAmountExVat = row.line.productSupplyAmount;
    const vatAmount = row.line.vatAmount;
    const deliveryFee = row.line.deliveryFee;
    const shipmentBoxCount = resolveShipmentBoxCount(
      row.rowKey,
      row.line.shipmentBoxCount,
      shipmentBoxCountsByRowKey
    );
    const logisticsFee = calculateLogisticsFee(shipmentBoxCount);
    const cnyExchangeRate = exchangeRatesByRowKey[row.rowKey] ?? null;
    const costAmountKrw = calculateCostAmountKrw(unitCostCny, lineQuantity, cnyExchangeRate);
    const profitAmount = calculateProfitAmount(
      salesAmountExVat,
      deliveryFee,
      logisticsFee,
      costAmountKrw
    );
    const { wkProfitAmount, inventioProfitAmount } = calculatePartnerProfitShares(profitAmount);

    return {
      rowKey: row.rowKey,
      lineId: row.line.id,
      shopOrderId: row.shopOrderId,
      isLegacyLine: row.line.id.endsWith('-legacy-line'),
      isReservation,
      lineOrderNumber: row.line.lineOrderNumber,
      orderNumber: row.orderNumber,
      lineIndex,
      companyName: row.line.companyName,
      productName: row.productName,
      orderDate: row.orderDate,
      orderBoxCount: row.line.orderBoxCount,
      shipmentBoxCount,
      lineQuantity,
      unitCostCny,
      cnyExchangeRate,
      salesAmountExVat,
      vatAmount,
      deliveryFee,
      logisticsFee,
      costAmountKrw,
      profitAmount,
      wkProfitAmount,
      inventioProfitAmount,
      wkSettlementPaid: row.line.wkSettlementPaid,
      inventioSettlementPaid: row.line.inventioSettlementPaid,
      logisticsFeePaid: row.line.logisticsFeePaid,
      logisticsFeePaidAt: row.line.logisticsFeePaidAt,
      wkSettlementPaidAt: row.line.wkSettlementPaidAt,
      inventioSettlementPaidAt: row.line.inventioSettlementPaidAt,
    };
  });
}

export function sumNullableAmounts(values: Array<number | null>): number | null {
  if (values.some((value) => value == null)) return null;
  return values.reduce((sum, value) => sum + (value ?? 0), 0);
}

export function sumAvailableAmounts(values: Array<number | null>): number {
  return values.reduce((sum, value) => sum + (value ?? 0), 0);
}

export interface SettlementPaymentTotals {
  paidAmount: number;
  unpaidAmount: number;
  paidCount: number;
  unpaidCount: number;
}

export interface SalesSettlementAggregateStats {
  rowCount: number;
  orderQuantityTotal: number;
  orderBoxCountTotal: number;
  salesAmountExVat: number;
  vatAmount: number;
  profitAmount: number;
  profitCalculatedCount: number;
  logisticsFeeTotal: number;
  logisticsPayment: SettlementPaymentTotals;
  wkPayment: SettlementPaymentTotals;
  inventioPayment: SettlementPaymentTotals;
}

export interface SalesSettlementDateGroupStats extends SalesSettlementAggregateStats {
  dateKey: string;
}

export function calculateLogisticsPaymentTotals(
  rows: SalesSettlementRow[]
): SettlementPaymentTotals {
  let paidAmount = 0;
  let unpaidAmount = 0;
  let paidCount = 0;
  let unpaidCount = 0;

  for (const row of rows) {
    const amount = row.logisticsFee;
    if (row.logisticsFeePaid) {
      paidAmount += amount;
      paidCount += 1;
    } else {
      unpaidAmount += amount;
      unpaidCount += 1;
    }
  }

  return { paidAmount, unpaidAmount, paidCount, unpaidCount };
}

export function calculateSettlementPaymentTotals(
  rows: SalesSettlementRow[],
  partner: 'wk' | 'inventio'
): SettlementPaymentTotals {
  let paidAmount = 0;
  let unpaidAmount = 0;
  let paidCount = 0;
  let unpaidCount = 0;

  for (const row of rows) {
    const amount = partner === 'wk' ? row.wkProfitAmount : row.inventioProfitAmount;
    if (amount == null) continue;

    const isPaid = partner === 'wk' ? row.wkSettlementPaid : row.inventioSettlementPaid;
    if (isPaid) {
      paidAmount += amount;
      paidCount += 1;
    } else {
      unpaidAmount += amount;
      unpaidCount += 1;
    }
  }

  return { paidAmount, unpaidAmount, paidCount, unpaidCount };
}

export function normalizeSettlementOrderDateKey(orderDate: string | null): string {
  if (!orderDate) return '미등록';
  return orderDate.slice(0, 10);
}

export function calculateSalesSettlementAggregateStats(
  rows: SalesSettlementRow[]
): SalesSettlementAggregateStats {
  return {
    rowCount: rows.length,
    orderQuantityTotal: rows.reduce((sum, row) => sum + row.lineQuantity, 0),
    orderBoxCountTotal: rows.reduce((sum, row) => sum + row.orderBoxCount, 0),
    salesAmountExVat: sumAvailableAmounts(rows.map((row) => row.salesAmountExVat)),
    vatAmount: sumAvailableAmounts(rows.map((row) => row.vatAmount)),
    profitAmount: sumAvailableAmounts(rows.map((row) => row.profitAmount)),
    profitCalculatedCount: rows.filter((row) => row.profitAmount != null).length,
    logisticsFeeTotal: rows.reduce((sum, row) => sum + row.logisticsFee, 0),
    logisticsPayment: calculateLogisticsPaymentTotals(rows),
    wkPayment: calculateSettlementPaymentTotals(rows, 'wk'),
    inventioPayment: calculateSettlementPaymentTotals(rows, 'inventio'),
  };
}

export function buildSalesSettlementStatsByDate(
  rows: SalesSettlementRow[]
): SalesSettlementDateGroupStats[] {
  const groups = new Map<string, SalesSettlementRow[]>();

  for (const row of rows) {
    const dateKey = normalizeSettlementOrderDateKey(row.orderDate);
    const groupRows = groups.get(dateKey) ?? [];
    groupRows.push(row);
    groups.set(dateKey, groupRows);
  }

  return Array.from(groups.entries())
    .map(([dateKey, groupRows]) => ({
      dateKey,
      ...calculateSalesSettlementAggregateStats(groupRows),
    }))
    .sort((a, b) => {
      if (a.dateKey === '미등록') return 1;
      if (b.dateKey === '미등록') return -1;
      return b.dateKey.localeCompare(a.dateKey);
    });
}

export function formatKrwAmount(value: number | null | undefined): string {
  if (value == null) return '-';
  return `₩${value.toLocaleString()}`;
}

export function formatCnyAmount(value: number | null | undefined): string {
  if (value == null) return '-';
  return `¥${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
