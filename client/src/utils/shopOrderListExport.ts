import ExcelJS from 'exceljs';
import type { ShopOrder, ShopOrderLine, ShopOrderStatus } from '../api/shopOrderApi';
import { getFullImageUrl } from '../api/purchaseOrderApi';
import { formatLineOrderRef } from './shopOrderLineListUtils';

export const SHOP_ORDER_LINE_TYPE_REGULAR = '일반 주문';
export const SHOP_ORDER_LINE_TYPE_RESERVATION = '예약 주문';
export const SHOP_ORDER_LINE_TYPE_OPTIONS = [
  SHOP_ORDER_LINE_TYPE_REGULAR,
  SHOP_ORDER_LINE_TYPE_RESERVATION,
] as const;

export function formatShopOrderLineTypeLabel(isReservation: boolean): string {
  return isReservation ? SHOP_ORDER_LINE_TYPE_RESERVATION : SHOP_ORDER_LINE_TYPE_REGULAR;
}

export function parseShopOrderLineTypeLabel(value: unknown): boolean | null {
  const normalized = String(value ?? '').trim();
  if (normalized === SHOP_ORDER_LINE_TYPE_REGULAR) return false;
  if (normalized === SHOP_ORDER_LINE_TYPE_RESERVATION) return true;
  return null;
}

export type ShopOrderLineListKind = 'all' | 'orders' | 'reservations';

export interface ShopOrderLineExportRow {
  orderNumber: string;
  productName: string;
  orderDate: string | null;
  lineIndex: number;
  line: ShopOrderLine;
  productMainImage?: string | null;
}

export interface ShopOrderLineListRow extends ShopOrderLineExportRow {
  shopOrderId: string;
  orderStatus: ShopOrderStatus;
  productMainImage: string | null;
  rowKey: string;
}

function filterLinesByKind(lines: ShopOrderLine[], kind: ShopOrderLineListKind): ShopOrderLine[] {
  if (kind === 'orders') {
    return lines.filter((line) => !line.isReservation);
  }
  if (kind === 'reservations') {
    return lines.filter((line) => line.isReservation);
  }
  return lines;
}

export function flattenShopOrderLines(
  orders: ShopOrder[],
  kind: ShopOrderLineListKind = 'all'
): ShopOrderLineExportRow[] {
  const rows: ShopOrderLineExportRow[] = [];

  for (const order of orders) {
    const relevantLines = filterLinesByKind(order.lines, kind);
    relevantLines.forEach((line, index) => {
      rows.push({
        orderNumber: order.orderNumber,
        productName: order.productName,
        orderDate: order.orderDate,
        lineIndex: index + 1,
        line,
      });
    });
  }

  return rows;
}

export function buildShopOrderLineListRows(
  orders: ShopOrder[],
  kind: ShopOrderLineListKind = 'all'
): ShopOrderLineListRow[] {
  const rows: ShopOrderLineListRow[] = [];

  for (const order of orders) {
    const relevantLines = filterLinesByKind(order.lines, kind);
    relevantLines.forEach((line, index) => {
      rows.push({
        orderNumber: order.orderNumber,
        productName: order.productName,
        orderDate: order.orderDate,
        lineIndex: index + 1,
        line,
        shopOrderId: order.id,
        orderStatus: order.status,
        productMainImage: order.productMainImage,
        rowKey: `${order.id}:${line.id}`,
      });
    });
  }

  return rows;
}

export function buildShopOrderStatementListRows(
  orders: ShopOrder[],
  kind: Extract<ShopOrderLineListKind, 'orders' | 'reservations'>
): ShopOrderLineListRow[] {
  return buildShopOrderLineListRows(orders, kind).filter(
    (row) => row.line.statementIssued || Boolean(row.line.statementFilePath)
  );
}

export function normalizeStatementDisplayField(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function buildStatementDisplayGroupKey(
  companyName: string | null | undefined,
  address: string | null | undefined,
  recipientName: string | null | undefined,
  isReservation: boolean
): string {
  return [
    isReservation ? 'r' : 'o',
    normalizeStatementDisplayField(companyName),
    normalizeStatementDisplayField(address),
    normalizeStatementDisplayField(recipientName),
  ].join('|');
}

export interface ShopOrderStatementGroupRow {
  groupKey: string;
  isReservation: boolean;
  companyName: string;
  address: string;
  recipientName: string;
  lineCount: number;
  totalAmount: number;
  latestUpdatedAt: string;
  orderRefsLabel: string;
  previewShopOrderId: string;
  previewLineId: string;
  lines: ShopOrderLineListRow[];
}

export function buildStatementGroupPreviewItems(
  group: ShopOrderStatementGroupRow
): Array<{ shopOrderId: string; lineId: string }> {
  return group.lines.map((row) => ({
    shopOrderId: row.shopOrderId,
    lineId: row.line.id,
  }));
}

export function groupShopOrderStatementRows(
  rows: ShopOrderLineListRow[]
): ShopOrderStatementGroupRow[] {
  const groups = new Map<string, ShopOrderLineListRow[]>();

  for (const row of rows) {
    const groupKey = buildStatementDisplayGroupKey(
      row.line.companyName,
      row.line.address,
      row.line.recipientName,
      row.line.isReservation
    );
    const existing = groups.get(groupKey);
    if (existing) {
      existing.push(row);
    } else {
      groups.set(groupKey, [row]);
    }
  }

  return Array.from(groups.entries()).map(([groupKey, groupLines]) => {
    const sortedLines = [...groupLines].sort(
      (a, b) => new Date(b.line.updatedAt).getTime() - new Date(a.line.updatedAt).getTime()
    );
    const representative = sortedLines[0];
    const totalAmount = groupLines.reduce(
      (sum, row) => sum + (row.line.totalAmount ?? 0),
      0
    );

    return {
      groupKey,
      isReservation: representative.line.isReservation,
      companyName: (representative.line.companyName ?? '').trim() || '미상',
      address: (representative.line.address ?? '').trim() || '-',
      recipientName: (representative.line.recipientName ?? '').trim() || '-',
      lineCount: groupLines.length,
      totalAmount,
      latestUpdatedAt: representative.line.updatedAt,
      orderRefsLabel: sortedLines
        .map((row) =>
          formatLineOrderRef(
            row.line.lineOrderNumber,
            row.orderNumber,
            row.lineIndex,
            row.line.isReservation ? '예약' : undefined
          )
        )
        .join(', '),
      previewShopOrderId: representative.shopOrderId,
      previewLineId: representative.line.id,
      lines: sortedLines,
    };
  });
}

async function downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function styleHeaderRow(row: ExcelJS.Row): void {
  row.font = { bold: true };
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF3F4F6' },
  };
  row.alignment = { vertical: 'middle', horizontal: 'center' };
}

const TRACKING_EXCEL_ROW_HEIGHT = 50;
const TRACKING_PRODUCT_IMAGE_COL = 6;
const TRACKING_PRODUCT_IMAGE_SIZE = { width: 46, height: 46 } as const;

function guessTrackingImageExtension(imageUrl: string, mime: string): 'jpeg' | 'png' | 'gif' {
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpeg';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('png')) return 'png';
  const lower = imageUrl.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'jpeg';
  if (lower.endsWith('.gif')) return 'gif';
  return 'png';
}

async function embedTrackingProductImage(
  workbook: ExcelJS.Workbook,
  worksheet: ExcelJS.Worksheet,
  rawUrl: string | null | undefined,
  dataRowIndex: number
): Promise<boolean> {
  const trimmed = rawUrl?.trim();
  if (!trimmed) return false;

  const imageUrl = getFullImageUrl(trimmed);
  if (!imageUrl) return false;

  try {
    const response = await fetch(imageUrl, { credentials: 'include' });
    if (!response.ok) return false;

    const blob = await response.blob();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const extension = guessTrackingImageExtension(imageUrl, blob.type || '');

    const imageId = workbook.addImage({
      buffer: bytes,
      extension,
    });

    worksheet.addImage(imageId, {
      tl: { col: TRACKING_PRODUCT_IMAGE_COL, row: dataRowIndex },
      ext: TRACKING_PRODUCT_IMAGE_SIZE,
    });
    return true;
  } catch (error) {
    console.warn('송장 엑셀 제품 사진 삽입 실패:', imageUrl, error);
    return false;
  }
}

export async function exportShopOrderTrackingExcel(rows: ShopOrderLineExportRow[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('송장');

  worksheet.columns = [
    { header: '주문번호', key: 'orderNumber', width: 14 },
    { header: '주문순번', key: 'lineIndex', width: 8 },
    { header: '상호명', key: 'companyName', width: 18 },
    { header: '수령인', key: 'recipientName', width: 12 },
    { header: '전화번호', key: 'phoneNumber', width: 14 },
    { header: '주소', key: 'address', width: 36 },
    { header: '제품사진', key: 'productImage', width: 10 },
    { header: '상품명', key: 'productName', width: 24 },
    { header: '박스수', key: 'orderBoxCount', width: 8 },
    { header: '입수', key: 'quantityPerBox', width: 8 },
    { header: '수량', key: 'quantity', width: 8 },
    { header: '송장번호', key: 'trackingNumber', width: 18 },
    { header: '비고', key: 'note', width: 16 },
  ];

  styleHeaderRow(worksheet.getRow(1));

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const quantity = row.line.orderBoxCount * row.line.quantityPerBox;
    const lineOrderRef = formatLineOrderRef(
      row.line.lineOrderNumber,
      row.orderNumber,
      row.lineIndex,
      row.line.isReservation ? '예약' : undefined
    );
    const excelRow = worksheet.addRow({
      orderNumber: lineOrderRef,
      lineIndex: row.line.lineOrderNumber ? '' : row.lineIndex,
      companyName: row.line.companyName ?? '',
      recipientName: row.line.recipientName ?? '',
      phoneNumber: row.line.phoneNumber ?? '',
      address: row.line.address ?? '',
      productImage: '',
      productName: row.productName,
      orderBoxCount: row.line.orderBoxCount,
      quantityPerBox: row.line.quantityPerBox,
      quantity,
      trackingNumber: row.line.trackingNumber ?? '',
      note: '',
    });

    excelRow.height = TRACKING_EXCEL_ROW_HEIGHT;
    excelRow.alignment = { vertical: 'middle', wrapText: true };

    const imageCell = excelRow.getCell(TRACKING_PRODUCT_IMAGE_COL + 1);
    const embedded = await embedTrackingProductImage(
      workbook,
      worksheet,
      row.productMainImage,
      i + 1
    );
    if (!embedded) {
      imageCell.value = row.productMainImage ? '사진 없음' : '';
      imageCell.alignment = { vertical: 'middle', horizontal: 'center' };
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  await downloadWorkbook(workbook, `주문관리_송장_${today}.xlsx`);
}

export async function exportShopOrderTaxInvoiceExcel(rows: ShopOrderLineExportRow[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('세금계산서');

  worksheet.columns = [
    { header: '작성일자', key: 'orderDate', width: 12 },
    { header: '주문번호', key: 'orderNumber', width: 14 },
    { header: '주문순번', key: 'lineIndex', width: 8 },
    { header: '공급받는자', key: 'companyName', width: 18 },
    { header: '품목', key: 'productName', width: 24 },
    { header: '규격', key: 'spec', width: 14 },
    { header: '수량', key: 'quantity', width: 8 },
    { header: '단가', key: 'unitPrice', width: 12 },
    { header: '공급가액', key: 'supplyAmount', width: 14 },
    { header: '부가세', key: 'vatAmount', width: 12 },
    { header: '합계', key: 'totalAmount', width: 14 },
    { header: '택배비', key: 'deliveryFee', width: 10 },
  ];

  styleHeaderRow(worksheet.getRow(1));

  for (const row of rows) {
    const quantity = row.line.orderBoxCount * row.line.quantityPerBox;
    const lineOrderRef = formatLineOrderRef(
      row.line.lineOrderNumber,
      row.orderNumber,
      row.lineIndex,
      row.line.isReservation ? '예약' : undefined
    );
    worksheet.addRow({
      orderDate: row.orderDate ?? '',
      orderNumber: lineOrderRef,
      lineIndex: row.line.lineOrderNumber ? '' : row.lineIndex,
      companyName: row.line.companyName ?? '',
      productName: row.productName,
      spec: `${row.line.orderBoxCount}박스×${row.line.quantityPerBox}개`,
      quantity,
      unitPrice: row.line.saleUnitPrice ?? 0,
      supplyAmount: row.line.productSupplyAmount ?? 0,
      vatAmount: row.line.vatAmount ?? 0,
      totalAmount: row.line.totalAmount ?? 0,
      deliveryFee: row.line.deliveryFee ?? 0,
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  await downloadWorkbook(workbook, `주문관리_세금계산서_${today}.xlsx`);
}

function applyShopOrderLineTypeValidation(
  worksheet: ExcelJS.Worksheet,
  columnLetter: string,
  rowCount: number
): void {
  if (rowCount <= 0) return;

  const range = `${columnLetter}2:${columnLetter}${rowCount + 1}`;
  worksheet.dataValidations.add(range, {
    type: 'list',
    allowBlank: false,
    formulae: [`"${SHOP_ORDER_LINE_TYPE_OPTIONS.join(',')}"`],
    showErrorMessage: true,
    errorStyle: 'stop',
    errorTitle: '주문구분',
    error: `${SHOP_ORDER_LINE_TYPE_REGULAR} 또는 ${SHOP_ORDER_LINE_TYPE_RESERVATION}을(를) 선택해 주세요.`,
  });
}

export async function exportShopOrderFormExcel(rows: ShopOrderLineExportRow[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('주문서');

  worksheet.columns = [
    { header: '주문구분', key: 'orderType', width: 12 },
    { header: '제품명', key: 'productName', width: 24 },
    { header: '상호명', key: 'companyName', width: 18 },
    { header: '주문수량', key: 'orderBoxCount', width: 10 },
    { header: '입수량', key: 'quantityPerBox', width: 10 },
    { header: '단가', key: 'unitPrice', width: 12 },
    { header: '택배', key: 'deliveryFee', width: 10 },
    { header: '총계(VAT미포함)', key: 'totalExVat', width: 14 },
    { header: '총계(VAT포함)', key: 'totalIncVat', width: 14 },
    { header: '주소', key: 'address', width: 36 },
    { header: '수령인', key: 'recipientName', width: 12 },
    { header: '전화번호', key: 'phoneNumber', width: 14 },
  ];

  styleHeaderRow(worksheet.getRow(1));

  for (const row of rows) {
    worksheet.addRow({
      orderType: formatShopOrderLineTypeLabel(row.line.isReservation),
      productName: row.productName,
      companyName: row.line.companyName ?? '',
      orderBoxCount: row.line.orderBoxCount,
      quantityPerBox: row.line.quantityPerBox,
      unitPrice: row.line.saleUnitPrice ?? 0,
      deliveryFee: row.line.deliveryFee ?? 0,
      totalExVat: row.line.productSupplyAmount ?? 0,
      totalIncVat: row.line.totalAmount ?? 0,
      address: row.line.address ?? '',
      recipientName: row.line.recipientName ?? '',
      phoneNumber: row.line.phoneNumber ?? '',
    });
  }

  applyShopOrderLineTypeValidation(worksheet, 'A', rows.length);

  const today = new Date().toISOString().slice(0, 10);
  await downloadWorkbook(workbook, `주문관리_주문서_${today}.xlsx`);
}
