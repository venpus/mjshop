import type { ShopOrderLine } from '../models/shopOrderLine.js';

export interface LinePriceSnapshot {
  orderBoxCount: number;
  quantityPerBox: number;
  saleUnitPrice: number | null;
  deliveryFee: number | null;
  vatExempt: boolean;
}

export function lineHasIssuedStatement(line: {
  statementIssued?: boolean;
  statementFilePath?: string | null;
}): boolean {
  return Boolean(line.statementIssued) || Boolean(line.statementFilePath);
}

export function buildLinePriceSnapshot(
  line: Pick<
    ShopOrderLine,
    'orderBoxCount' | 'quantityPerBox' | 'saleUnitPrice' | 'deliveryFee' | 'vatExempt'
  >,
  orderQuantityPerBox: number
): LinePriceSnapshot {
  return {
    orderBoxCount: line.orderBoxCount,
    quantityPerBox: line.quantityPerBox || orderQuantityPerBox,
    saleUnitPrice: line.saleUnitPrice,
    deliveryFee: line.deliveryFee,
    vatExempt: line.vatExempt,
  };
}

export function linePriceSnapshotChanged(
  before: LinePriceSnapshot,
  after: LinePriceSnapshot
): boolean {
  return (
    before.orderBoxCount !== after.orderBoxCount ||
    before.quantityPerBox !== after.quantityPerBox ||
    before.saleUnitPrice !== after.saleUnitPrice ||
    before.deliveryFee !== after.deliveryFee ||
    before.vatExempt !== after.vatExempt
  );
}
