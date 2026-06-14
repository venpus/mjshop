import ExcelJS from 'exceljs';
import type { ShopOrder, ShopOrderLine, ShopOrderStatus } from '../api/shopOrderApi';

export interface ShopOrderLineExportRow {
  orderNumber: string;
  productName: string;
  orderDate: string | null;
  lineIndex: number;
  line: ShopOrderLine;
}

export interface ShopOrderLineListRow extends ShopOrderLineExportRow {
  shopOrderId: string;
  orderStatus: ShopOrderStatus;
  productMainImage: string | null;
  rowKey: string;
}

export function flattenShopOrderLines(orders: ShopOrder[]): ShopOrderLineExportRow[] {
  const rows: ShopOrderLineExportRow[] = [];

  for (const order of orders) {
    order.lines.forEach((line, index) => {
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

export function buildShopOrderLineListRows(orders: ShopOrder[]): ShopOrderLineListRow[] {
  const rows: ShopOrderLineListRow[] = [];

  for (const order of orders) {
    order.lines.forEach((line, index) => {
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
    { header: '상품명', key: 'productName', width: 24 },
    { header: '박스수', key: 'orderBoxCount', width: 8 },
    { header: '입수', key: 'quantityPerBox', width: 8 },
    { header: '수량', key: 'quantity', width: 8 },
    { header: '송장번호', key: 'trackingNumber', width: 18 },
    { header: '비고', key: 'note', width: 16 },
  ];

  styleHeaderRow(worksheet.getRow(1));

  for (const row of rows) {
    const quantity = row.line.orderBoxCount * row.line.quantityPerBox;
    worksheet.addRow({
      orderNumber: row.orderNumber,
      lineIndex: row.lineIndex,
      companyName: row.line.companyName ?? '',
      recipientName: row.line.recipientName ?? '',
      phoneNumber: row.line.phoneNumber ?? '',
      address: row.line.address ?? '',
      productName: row.productName,
      orderBoxCount: row.line.orderBoxCount,
      quantityPerBox: row.line.quantityPerBox,
      quantity,
      trackingNumber: row.line.trackingNumber ?? '',
      note: '',
    });
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
    worksheet.addRow({
      orderDate: row.orderDate ?? '',
      orderNumber: row.orderNumber,
      lineIndex: row.lineIndex,
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

export async function exportShopOrderFormExcel(rows: ShopOrderLineExportRow[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('주문서');

  worksheet.columns = [
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

  const today = new Date().toISOString().slice(0, 10);
  await downloadWorkbook(workbook, `주문관리_주문서_${today}.xlsx`);
}
