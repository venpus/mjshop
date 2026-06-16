import type { ShopOrder } from '../api/shopOrderApi';
import type { ShopShipmentBatchListItem } from '../api/shopShipmentApi';
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
  lineQuantity: number;
  unitCostCny: number | null;
  cnyExchangeRate: number | null;
  salesAmountExVat: number | null;
  vatAmount: number | null;
  logisticsFee: number;
  costAmountKrw: number | null;
  profitAmount: number | null;
  wkProfitAmount: number | null;
  inventioProfitAmount: number | null;
  wkSettlementPaid: boolean;
  inventioSettlementPaid: boolean;
  wkSettlementPaidAt: string | null;
  inventioSettlementPaidAt: string | null;
}

export function parseCnyExchangeRateInput(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parsed = parseFloat(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function calculateBatchLogisticsFee(
  shipmentBoxCount: number | null | undefined,
  deliveryFee: number | null | undefined,
  boxPrice: number | null | undefined
): number {
  const boxes = shipmentBoxCount ?? 0;
  const fee = deliveryFee ?? 0;
  const price = boxPrice ?? 0;
  return boxes * LOGISTICS_FEE_PER_BOX_KRW + fee + price;
}

export function buildLineLogisticsFeeMap(
  batches: ShopShipmentBatchListItem[]
): Map<string, number> {
  const map = new Map<string, number>();

  for (const batch of batches) {
    const lineCount = batch.lineItems.length;
    if (lineCount === 0) continue;

    const totalFee = calculateBatchLogisticsFee(
      batch.shipmentBoxCount,
      batch.deliveryFee,
      batch.boxPrice
    );
    const baseShare = Math.floor(totalFee / lineCount);
    let remainder = totalFee - baseShare * lineCount;

    for (const line of batch.lineItems) {
      const share = baseShare + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
      map.set(line.lineId, (map.get(line.lineId) ?? 0) + share);
    }
  }

  return map;
}

export function buildLineBatchLogisticsPaidMap(
  batches: ShopShipmentBatchListItem[]
): Map<string, boolean> {
  const map = new Map<string, boolean>();
  for (const batch of batches) {
    for (const line of batch.lineItems) {
      map.set(line.lineId, batch.logisticsFeePaid);
    }
  }
  return map;
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

export function formatSettlementPaidDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const datePart = value.includes('T') ? value.split('T')[0] : value.slice(0, 10);
  return datePart || null;
}

export function calculateLineQuantity(orderBoxCount: number, quantityPerBox: number): number {
  return orderBoxCount * quantityPerBox;
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
  logisticsFee: number,
  costAmountKrw: number | null
): number | null {
  if (salesAmountExVat == null) return null;
  if (costAmountKrw == null) return null;
  return salesAmountExVat - logisticsFee - costAmountKrw;
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
  lineLogisticsFeeByLineId: Map<string, number>
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
    const logisticsFee = lineLogisticsFeeByLineId.get(row.line.id) ?? 0;
    const cnyExchangeRate = exchangeRatesByRowKey[row.rowKey] ?? null;
    const costAmountKrw = calculateCostAmountKrw(unitCostCny, lineQuantity, cnyExchangeRate);
    const profitAmount = calculateProfitAmount(salesAmountExVat, logisticsFee, costAmountKrw);
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
      lineQuantity,
      unitCostCny,
      cnyExchangeRate,
      salesAmountExVat,
      vatAmount,
      logisticsFee,
      costAmountKrw,
      profitAmount,
      wkProfitAmount,
      inventioProfitAmount,
      wkSettlementPaid: row.line.wkSettlementPaid,
      inventioSettlementPaid: row.line.inventioSettlementPaid,
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

export interface PartnerLedgerSummary {
  totalAmount: number;
  entryCount: number;
}

export interface PartnerLedgerTotals {
  wk: PartnerLedgerSummary;
  inventio: PartnerLedgerSummary;
}

export interface SalesSettlementAggregateStats {
  rowCount: number;
  orderQuantityTotal: number;
  orderBoxCountTotal: number;
  salesAmountExVat: number;
  vatAmount: number;
  costAmountKrw: number;
  costCalculatedCount: number;
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
  rows: SalesSettlementRow[],
  lineBatchPaidMap: Map<string, boolean> = new Map()
): SettlementPaymentTotals {
  let paidAmount = 0;
  let unpaidAmount = 0;
  let paidCount = 0;
  let unpaidCount = 0;

  for (const row of rows) {
    const amount = row.logisticsFee;
    if (lineBatchPaidMap.get(row.lineId)) {
      paidAmount += amount;
      paidCount += 1;
    } else {
      unpaidAmount += amount;
      unpaidCount += 1;
    }
  }

  return { paidAmount, unpaidAmount, paidCount, unpaidCount };
}

export function calculatePartnerGrossTotal(
  rows: SalesSettlementRow[],
  partner: 'wk' | 'inventio'
): number {
  return sumAvailableAmounts(
    rows.map((row) => (partner === 'wk' ? row.wkProfitAmount : row.inventioProfitAmount))
  );
}

export function calculatePartnerNetTotal(grossAmount: number, ledgerPaidTotal: number): number {
  return grossAmount - ledgerPaidTotal;
}

export function calculatePartnerLedgerPaymentTotals(
  rows: SalesSettlementRow[],
  partner: 'wk' | 'inventio',
  ledgerPaidTotal: number,
  ledgerEntryCount: number
): SettlementPaymentTotals {
  const grossAmount = calculatePartnerGrossTotal(rows, partner);
  const eligibleCount = rows.filter(
    (row) => (partner === 'wk' ? row.wkProfitAmount : row.inventioProfitAmount) != null
  ).length;

  return {
    paidAmount: ledgerPaidTotal,
    unpaidAmount: grossAmount - ledgerPaidTotal,
    paidCount: ledgerEntryCount,
    unpaidCount: eligibleCount,
  };
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
  rows: SalesSettlementRow[],
  lineBatchPaidMap: Map<string, boolean> = new Map(),
  ledgerTotals: PartnerLedgerTotals = {
    wk: { totalAmount: 0, entryCount: 0 },
    inventio: { totalAmount: 0, entryCount: 0 },
  }
): SalesSettlementAggregateStats {
  return {
    rowCount: rows.length,
    orderQuantityTotal: rows.reduce((sum, row) => sum + row.lineQuantity, 0),
    orderBoxCountTotal: rows.reduce((sum, row) => sum + row.orderBoxCount, 0),
    salesAmountExVat: sumAvailableAmounts(rows.map((row) => row.salesAmountExVat)),
    vatAmount: sumAvailableAmounts(rows.map((row) => row.vatAmount)),
    costAmountKrw: sumAvailableAmounts(rows.map((row) => row.costAmountKrw)),
    costCalculatedCount: rows.filter((row) => row.costAmountKrw != null).length,
    profitAmount: sumAvailableAmounts(rows.map((row) => row.profitAmount)),
    profitCalculatedCount: rows.filter((row) => row.profitAmount != null).length,
    logisticsFeeTotal: rows.reduce((sum, row) => sum + row.logisticsFee, 0),
    logisticsPayment: calculateLogisticsPaymentTotals(rows, lineBatchPaidMap),
    wkPayment: calculatePartnerLedgerPaymentTotals(
      rows,
      'wk',
      ledgerTotals.wk.totalAmount,
      ledgerTotals.wk.entryCount
    ),
    inventioPayment: calculatePartnerLedgerPaymentTotals(
      rows,
      'inventio',
      ledgerTotals.inventio.totalAmount,
      ledgerTotals.inventio.entryCount
    ),
  };
}

export function buildSalesSettlementStatsByDate(
  rows: SalesSettlementRow[],
  lineBatchPaidMap: Map<string, boolean> = new Map(),
  ledgerTotals: PartnerLedgerTotals = {
    wk: { totalAmount: 0, entryCount: 0 },
    inventio: { totalAmount: 0, entryCount: 0 },
  }
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
      ...calculateSalesSettlementAggregateStats(groupRows, lineBatchPaidMap, ledgerTotals),
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
