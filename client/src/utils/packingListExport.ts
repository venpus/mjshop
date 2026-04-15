import ExcelJS from 'exceljs';
import type { PackingListItem } from '../components/packing-list/types';
import { getFullImageUrl } from '../api/purchaseOrderApi';
import { getSweetTrackerInvoicesByPackingListCode } from '../api/sweetTrackerApi';

// 코드 그룹 헤더 정보
export interface CodeGroupHeader {
  date: string; // 발송일
  code: string; // 코드
  boxCount: number; // 박스 수 (그룹 전체 박스 수)
  unit: '박스' | '마대'; // 단위
  totalQuantity: number; // 총수량 (그룹 내 모든 제품의 totalQuantity 합계)
  domesticInvoices: string[]; // 내륙송장 번호 배열
  /** 내륙송장에 첨부된 참고 사진 URL (순서 유지) */
  domesticInvoiceImageUrls: string[];
}

// 제품 세부 행 정보
export interface ProductDetailRow {
  productName: string; // 제품명
  purchaseOrderId: string; // 발주 ID
  entryQuantity: string; // 한박스 포장 구성 (예: "2종 x 5개 x 3세트")
  entryQuantityResult: number; // 한박스 수량 (1박스당 수량)
  boxNumber: number; // 박스 번호 (1, 2, 3, ...)
  unit: '박스' | '마대'; // 단위 (헤더에서 가져옴)
  /** 제품 사진 URL (상대·절대 모두 가능) */
  productImage: string;
}

// 코드 그룹 전체 정보
export interface CodeGroup {
  header: CodeGroupHeader;
  details: ProductDetailRow[];
}

const DETAIL_COL_COUNT = 5;

/** 선택 키와 동일하게 코드·발송일로 그룹을 구분 (엑셀 연관 송장 맵 키) */
function packingListExportGroupKey(code: string, date: string): string {
  return `${code.trim()}::${date.trim()}`;
}
const PRODUCT_IMAGE_COL = 0;
const PRODUCT_IMAGE_SIZE = { width: 72, height: 72 } as const;
const DOMESTIC_IMAGE_SIZE = { width: 64, height: 64 } as const;
const DOMESTIC_IMAGES_PER_ROW = 5;

function guessImageExtension(imageUrl: string, mime: string): 'jpeg' | 'png' | 'gif' {
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpeg';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('png')) return 'png';
  const base = imageUrl.toLowerCase().split('?')[0];
  if (base.endsWith('.jpg') || base.endsWith('.jpeg')) return 'jpeg';
  if (base.endsWith('.gif')) return 'gif';
  return 'png';
}

/**
 * URL에서 이미지 바이너리를 가져와 워크북에 삽입합니다. (쿠키 포함 요청)
 */
async function embedImageFromUrl(
  workbook: ExcelJS.Workbook,
  worksheet: ExcelJS.Worksheet,
  rawUrl: string,
  anchor: { col: number; row: number },
  size: { width: number; height: number }
): Promise<boolean> {
  const trimmed = rawUrl?.trim();
  if (!trimmed) return false;

  const imageUrl = getFullImageUrl(trimmed);
  if (!imageUrl) return false;

  try {
    const response = await fetch(imageUrl, { credentials: 'include' });
    if (!response.ok) return false;

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const extension = guessImageExtension(imageUrl, blob.type || '');

    const imageId = workbook.addImage({
      buffer: bytes,
      extension,
    });

    worksheet.addImage(imageId, {
      tl: { col: anchor.col, row: anchor.row },
      ext: size,
    });
    return true;
  } catch (e) {
    console.warn('패킹리스트 엑셀 이미지 삽입 실패:', imageUrl, e);
    return false;
  }
}

/**
 * 선택된 코드별로 그룹화
 */
function extractSelectedCodeGroups(
  selectedKeys: Set<string>,
  packingListItems: PackingListItem[]
): Map<string, PackingListItem[]> {
  const groupedByCode = new Map<string, PackingListItem[]>();

  selectedKeys.forEach((key) => {
    const parts = key.split('::');
    if (parts.length !== 2) return;
    const code = parts[0];
    const date = parts[1];

    const groupItems = packingListItems.filter((item) => item.code === code && item.date === date);

    if (groupItems.length > 0) {
      groupedByCode.set(key, groupItems);
    }
  });

  return groupedByCode;
}

/**
 * 코드 그룹 헤더 생성
 */
function createCodeGroupHeader(items: PackingListItem[]): CodeGroupHeader {
  const firstItem = items.find((item) => item.isFirstRow);
  if (!firstItem) {
    throw new Error('첫 번째 행을 찾을 수 없습니다.');
  }

  const totalBoxCount = items.reduce((sum, item) => {
    const boxCount = parseInt(item.boxCount, 10) || 0;
    return sum + boxCount;
  }, 0);

  const totalQuantity = items.reduce((sum, item) => sum + item.totalQuantity, 0);

  const domesticInvoices = (firstItem.domesticInvoice || [])
    .map((invoice) => invoice.number)
    .filter((number) => number && number.trim() !== '');

  const domesticInvoiceImageUrls: string[] = [];
  for (const inv of firstItem.domesticInvoice || []) {
    for (const img of inv.images || []) {
      const u = img.url?.trim();
      if (u) domesticInvoiceImageUrls.push(u);
    }
  }

  return {
    date: firstItem.date,
    code: firstItem.code,
    boxCount: totalBoxCount,
    unit: firstItem.unit,
    totalQuantity,
    domesticInvoices,
    domesticInvoiceImageUrls,
  };
}

/**
 * 제품별 박스 행 생성
 */
function createProductDetailRows(items: PackingListItem[], unit: '박스' | '마대'): ProductDetailRow[] {
  const detailRows: ProductDetailRow[] = [];

  items.forEach((item) => {
    const boxCount = parseInt(item.boxCount, 10) || 0;

    const entryQuantityResult = boxCount > 0 ? item.totalQuantity / boxCount : item.totalQuantity;

    for (let boxNum = 1; boxNum <= boxCount; boxNum++) {
      detailRows.push({
        productName: item.productName,
        purchaseOrderId: item.purchaseOrderId || '',
        entryQuantity: item.entryQuantity,
        entryQuantityResult,
        boxNumber: boxNum,
        unit,
        productImage: item.productImage || '',
      });
    }
  });

  return detailRows;
}

/**
 * 패킹리스트 데이터를 엑셀용 코드 그룹으로 변환
 */
export function transformToExcelData(selectedKeys: Set<string>, packingListItems: PackingListItem[]): CodeGroup[] {
  const codeGroups: CodeGroup[] = [];

  const groupedByCode = extractSelectedCodeGroups(selectedKeys, packingListItems);

  groupedByCode.forEach((items) => {
    const header = createCodeGroupHeader(items);
    const details = createProductDetailRows(items, header.unit);
    codeGroups.push({ header, details });
  });

  return codeGroups;
}

/**
 * 발주코드 조회 (발주 ID -> 발주코드 매핑)
 */
export async function fetchPurchaseOrderNumbers(codeGroups: CodeGroup[]): Promise<Map<string, string>> {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  const purchaseOrderIds = new Set<string>();

  codeGroups.forEach((group) => {
    group.details.forEach((detail) => {
      if (detail.purchaseOrderId) {
        purchaseOrderIds.add(detail.purchaseOrderId);
      }
    });
  });

  const poNumberMap = new Map<string, string>();

  await Promise.all(
    Array.from(purchaseOrderIds).map(async (id) => {
      try {
        const response = await fetch(`${API_BASE_URL}/purchase-orders/${id}`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            poNumberMap.set(id, data.data.po_number || id);
          } else {
            poNumberMap.set(id, id);
          }
        } else {
          poNumberMap.set(id, id);
        }
      } catch (error) {
        console.error(`발주 정보 조회 실패 (ID: ${id}):`, error);
        poNumberMap.set(id, id);
      }
    })
  );

  return poNumberMap;
}

/**
 * 패킹리스트 코드별 택배 조회(DB)에 연결된 운송장 번호 목록 (엑셀 하단 표시용)
 */
export async function fetchRelatedTrackingInvoiceNosForExport(
  userId: string | undefined,
  codeGroups: CodeGroup[]
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  const uniqueCodes = [...new Set(codeGroups.map((g) => g.header.code.trim()).filter(Boolean))];

  const codeToNos = new Map<string, string[]>();
  for (const code of uniqueCodes) {
    codeToNos.set(code, []);
  }

  if (userId && uniqueCodes.length > 0) {
    await Promise.all(
      uniqueCodes.map(async (code) => {
        try {
          const items = await getSweetTrackerInvoicesByPackingListCode(userId, code);
          codeToNos.set(
            code,
            items.map((it) => it.invoiceNo).filter((no) => no && String(no).trim() !== '')
          );
        } catch (e) {
          console.warn(`연관 운송장 조회 실패 (코드: ${code}):`, e);
          codeToNos.set(code, []);
        }
      })
    );
  }

  for (const g of codeGroups) {
    const key = packingListExportGroupKey(g.header.code, g.header.date);
    const c = g.header.code.trim();
    map.set(key, [...(codeToNos.get(c) ?? [])]);
  }

  return map;
}

/**
 * 엑셀 파일 생성 및 다운로드
 */
export async function createExcelFile(
  codeGroups: CodeGroup[],
  poNumberMap: Map<string, string>,
  /** 키: `코드::발송일` (packingListExportGroupKey와 동일) */
  relatedInvoiceNosByGroupKey: Map<string, string[]>
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('패킹리스트');

  worksheet.columns = [
    { width: 14 }, // 제품사진
    { width: 25 }, // 제품명
    { width: 15 }, // 발주코드
    { width: 25 }, // 한박스 포장 구성
    { width: 20 }, // 한박스 수량
  ];

  for (let groupIndex = 0; groupIndex < codeGroups.length; groupIndex++) {
    const group = codeGroups[groupIndex]!;

    const headerText = `발송일: ${group.header.date} | 코드: ${group.header.code} | 박스: ${group.header.boxCount} | 단위: ${group.header.unit} | 총수량: ${group.header.totalQuantity}`;
    const headerRow = worksheet.addRow([headerText]);
    headerRow.font = { bold: true, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.mergeCells(headerRow.number, 1, headerRow.number, DETAIL_COL_COUNT);

    const invoiceRowData: string[] = ['내륙송장:'];
    if (group.header.domesticInvoices.length > 0) {
      group.header.domesticInvoices.forEach((invoiceNumber) => {
        invoiceRowData.push(invoiceNumber);
      });
    } else {
      invoiceRowData.push('(없음)');
    }

    const invoiceRow = worksheet.addRow(invoiceRowData);
    const firstCell = invoiceRow.getCell(1);
    firstCell.font = { bold: true };
    firstCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F0F0' },
    };
    firstCell.alignment = { horizontal: 'center', vertical: 'middle' };

    for (let i = 2; i <= invoiceRowData.length; i++) {
      const cell = invoiceRow.getCell(i);
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    if (group.header.domesticInvoiceImageUrls.length > 0) {
      const captionRow = worksheet.addRow(['내륙송장 참고사진', '', '', '', '']);
      captionRow.getCell(1).font = { bold: true };
      captionRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F0F0' },
      };
      captionRow.alignment = { horizontal: 'left', vertical: 'middle' };
      worksheet.mergeCells(captionRow.number, 1, captionRow.number, DETAIL_COL_COUNT);

      for (let i = 0; i < group.header.domesticInvoiceImageUrls.length; i += DOMESTIC_IMAGES_PER_ROW) {
        const slice = group.header.domesticInvoiceImageUrls.slice(i, i + DOMESTIC_IMAGES_PER_ROW);
        const imgRow = worksheet.addRow(['', '', '', '', '']);
        imgRow.height = 72;
        const row0based = imgRow.number - 1;
        for (let j = 0; j < slice.length; j++) {
          const ok = await embedImageFromUrl(workbook, worksheet, slice[j]!, {
            col: j,
            row: row0based,
          }, DOMESTIC_IMAGE_SIZE);
          if (!ok) {
            imgRow.getCell(j + 1).value = '—';
            imgRow.getCell(j + 1).alignment = { horizontal: 'center', vertical: 'middle' };
          }
        }
      }
    }

    const detailHeaderRow = worksheet.addRow(['제품사진', '제품명', '발주코드', '한박스 포장 구성', '한박스 수량']);
    detailHeaderRow.font = { bold: true };
    detailHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F0F0' },
    };
    detailHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };

    for (const detail of group.details) {
      const poNumber = detail.purchaseOrderId
        ? poNumberMap.get(detail.purchaseOrderId) || detail.purchaseOrderId
        : '';

      const quantityDisplay = `${detail.entryQuantityResult}개 (${detail.unit}${detail.boxNumber})`;

      const dataRow = worksheet.addRow(['', detail.productName, poNumber, detail.entryQuantity, quantityDisplay]);
      dataRow.height = 76;

      const imgCell = dataRow.getCell(1);
      imgCell.alignment = { horizontal: 'center', vertical: 'middle' };

      const row0based = dataRow.number - 1;
      const embedded = await embedImageFromUrl(
        workbook,
        worksheet,
        detail.productImage,
        { col: PRODUCT_IMAGE_COL, row: row0based },
        PRODUCT_IMAGE_SIZE
      );
      if (!embedded) {
        imgCell.value = detail.productImage?.trim() ? '이미지 로드 실패' : '—';
      }

      dataRow.getCell(2).alignment = { vertical: 'middle', wrapText: true };
      dataRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
      dataRow.getCell(4).alignment = { vertical: 'middle', wrapText: true };
      dataRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // 제품 표(패킹리스트 세부 행) 마지막 행 기준 아래 3행 띄운 뒤 연관 송장 표기
    for (let spacer = 0; spacer < 3; spacer++) {
      worksheet.addRow(['', '', '', '', '']);
    }

    const groupKey = packingListExportGroupKey(group.header.code, group.header.date);
    const relatedNos = relatedInvoiceNosByGroupKey.get(groupKey) ?? [];
    const relatedRowData: string[] = [`연관 송장 번호 (발송일 ${group.header.date}):`];
    if (relatedNos.length > 0) {
      relatedNos.forEach((no) => relatedRowData.push(no));
    } else {
      relatedRowData.push('(없음)');
    }
    const relatedRow = worksheet.addRow(relatedRowData);
    const relFirst = relatedRow.getCell(1);
    relFirst.font = { bold: true };
    relFirst.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F8FF' },
    };
    relFirst.alignment = { horizontal: 'center', vertical: 'middle' };
    for (let i = 2; i <= relatedRowData.length; i++) {
      relatedRow.getCell(i).alignment = { horizontal: 'center', vertical: 'middle' };
      relatedRow.getCell(i).font = { name: 'Consolas', size: 10 };
    }

    if (groupIndex < codeGroups.length - 1) {
      worksheet.addRow([]);
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const today = new Date().toISOString().split('T')[0];
  link.download = `패킹리스트_보내기_${today}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
