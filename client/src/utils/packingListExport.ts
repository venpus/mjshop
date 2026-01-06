import ExcelJS from 'exceljs';
import type { PackingListItem } from '../components/packing-list/types';
import { getGroupId } from './packingListUtils';

// 코드 그룹 헤더 정보
export interface CodeGroupHeader {
  date: string;           // 발송일
  code: string;           // 코드
  boxCount: number;       // 박스 수 (그룹 전체 박스 수)
  unit: '박스' | '마대';  // 단위
  totalQuantity: number;  // 총수량 (그룹 내 모든 제품의 totalQuantity 합계)
  domesticInvoices: string[]; // 내륙송장 번호 배열
}

// 제품 세부 행 정보
export interface ProductDetailRow {
  productName: string;              // 제품명
  purchaseOrderId: string;           // 발주 ID
  entryQuantity: string;            // 한박스 포장 구성 (예: "2종 x 5개 x 3세트")
  entryQuantityResult: number;       // 한박스 수량 (1박스당 수량)
  boxNumber: number;                // 박스 번호 (1, 2, 3, ...)
  unit: '박스' | '마대';            // 단위 (헤더에서 가져옴)
}

// 코드 그룹 전체 정보
export interface CodeGroup {
  header: CodeGroupHeader;
  details: ProductDetailRow[];
}

/**
 * 선택된 코드별로 그룹화
 */
function extractSelectedCodeGroups(
  selectedKeys: Set<string>,
  packingListItems: PackingListItem[]
): Map<string, PackingListItem[]> {
  const groupedByCode = new Map<string, PackingListItem[]>();
  
  selectedKeys.forEach(key => {
    // key 형식: "code::date" (예: "G26-1::2025-12-11")
    const parts = key.split('::');
    if (parts.length !== 2) return;
    const code = parts[0];
    const date = parts[1];
    
    const groupItems = packingListItems.filter(
      item => item.code === code && item.date === date
    );
    
    if (groupItems.length > 0) {
      groupedByCode.set(key, groupItems);
    }
  });
  
  return groupedByCode;
}

/**
 * 코드 그룹 헤더 생성
 */
function createCodeGroupHeader(
  items: PackingListItem[]
): CodeGroupHeader {
  const firstItem = items.find(item => item.isFirstRow);
  if (!firstItem) {
    throw new Error('첫 번째 행을 찾을 수 없습니다.');
  }
  
  // 그룹 내 모든 제품의 박스 수 합계
  const totalBoxCount = items.reduce((sum, item) => {
    const boxCount = parseInt(item.boxCount) || 0;
    return sum + boxCount;
  }, 0);
  
  // 그룹 내 모든 제품의 총수량 합계
  const totalQuantity = items.reduce((sum, item) => {
    return sum + item.totalQuantity;
  }, 0);
  
  // 내륙송장 번호 추출 (첫 번째 아이템의 domesticInvoice 배열에서)
  const domesticInvoices = (firstItem.domesticInvoice || [])
    .map(invoice => invoice.number)
    .filter(number => number && number.trim() !== ''); // 빈 문자열 제거
  
  return {
    date: firstItem.date,
    code: firstItem.code,
    boxCount: totalBoxCount,
    unit: firstItem.unit,
    totalQuantity: totalQuantity,
    domesticInvoices: domesticInvoices
  };
}

/**
 * 제품별 박스 행 생성
 */
function createProductDetailRows(
  items: PackingListItem[],
  unit: '박스' | '마대'
): ProductDetailRow[] {
  const detailRows: ProductDetailRow[] = [];
  
  items.forEach(item => {
    const boxCount = parseInt(item.boxCount) || 0;
    
    // 한박스 수량 계산: 총수량 / 박스수
    const entryQuantityResult = boxCount > 0 
      ? item.totalQuantity / boxCount 
      : item.totalQuantity;
    
    // 박스 수만큼 행 생성
    for (let boxNum = 1; boxNum <= boxCount; boxNum++) {
      detailRows.push({
        productName: item.productName,
        purchaseOrderId: item.purchaseOrderId || '',
        entryQuantity: item.entryQuantity,
        entryQuantityResult: entryQuantityResult,
        boxNumber: boxNum,
        unit: unit
      });
    }
  });
  
  return detailRows;
}

/**
 * 패킹리스트 데이터를 엑셀용 코드 그룹으로 변환
 */
export function transformToExcelData(
  selectedKeys: Set<string>,
  packingListItems: PackingListItem[]
): CodeGroup[] {
  const codeGroups: CodeGroup[] = [];
  
  // 1. 선택된 코드별로 그룹화
  const groupedByCode = extractSelectedCodeGroups(selectedKeys, packingListItems);
  
  // 2. 각 코드 그룹 처리
  groupedByCode.forEach((items, groupKey) => {
    // 그룹 헤더 생성
    const header = createCodeGroupHeader(items);
    
    // 세부 행 생성
    const details = createProductDetailRows(items, header.unit);
    
    codeGroups.push({ header, details });
  });
  
  return codeGroups;
}

/**
 * 발주코드 조회 (발주 ID -> 발주코드 매핑)
 */
export async function fetchPurchaseOrderNumbers(
  codeGroups: CodeGroup[]
): Promise<Map<string, string>> {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  
  // 모든 purchaseOrderId 수집
  const purchaseOrderIds = new Set<string>();
  
  codeGroups.forEach(group => {
    group.details.forEach(detail => {
      if (detail.purchaseOrderId) {
        purchaseOrderIds.add(detail.purchaseOrderId);
      }
    });
  });
  
  // API로 발주 정보 일괄 조회
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
        // 실패 시 ID를 그대로 사용
        poNumberMap.set(id, id);
      }
    })
  );
  
  return poNumberMap;
}

/**
 * 엑셀 파일 생성 및 다운로드
 */
export async function createExcelFile(
  codeGroups: CodeGroup[],
  poNumberMap: Map<string, string>
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('패킹리스트');
  
  let currentRow = 1;
  
  codeGroups.forEach((group, groupIndex) => {
    // 1. 코드 그룹 헤더 행
    const headerText = `발송일: ${group.header.date} | 코드: ${group.header.code} | 박스: ${group.header.boxCount} | 단위: ${group.header.unit} | 총수량: ${group.header.totalQuantity}`;
    const headerRow = worksheet.addRow([headerText]);
    
    // 헤더 스타일 적용
    headerRow.font = { bold: true, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' } // 회색 배경
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // 헤더 셀 병합 (4개 컬럼)
    worksheet.mergeCells(currentRow, 1, currentRow, 4);
    currentRow++;
    
    // 2. 내륙송장 행
    const invoiceRowData: string[] = ['내륙송장:'];
    
    // 내륙송장이 있으면 각 송장번호를 별도 셀에 추가
    if (group.header.domesticInvoices.length > 0) {
      group.header.domesticInvoices.forEach(invoiceNumber => {
        invoiceRowData.push(invoiceNumber);
      });
    } else {
      // 내륙송장이 없으면 "(없음)" 표시
      invoiceRowData.push('(없음)');
    }
    
    const invoiceRow = worksheet.addRow(invoiceRowData);
    
    // 첫 번째 셀("내륙송장:") 스타일 적용
    const firstCell = invoiceRow.getCell(1);
    firstCell.font = { bold: true };
    firstCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F0F0' } // 연한 회색
    };
    firstCell.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // 송장번호 셀들 스타일 적용
    for (let i = 2; i <= invoiceRowData.length; i++) {
      const cell = invoiceRow.getCell(i);
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
    
    currentRow++;
    
    // 3. 세부 헤더 행
    const detailHeaderRow = worksheet.addRow([
      '제품명',
      '발주코드',
      '한박스 포장 구성',
      '한박스 수량'
    ]);
    
    detailHeaderRow.font = { bold: true };
    detailHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F0F0' } // 연한 회색
    };
    detailHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };
    currentRow++;
    
    // 4. 세부 데이터 행
    group.details.forEach(detail => {
      // 발주코드 조회 (poNumberMap에서)
      const poNumber = detail.purchaseOrderId 
        ? (poNumberMap.get(detail.purchaseOrderId) || detail.purchaseOrderId)
        : '';
      
      // 한박스 수량 표시 형식: "30개 (박스1)" 또는 "30개 (마대1)"
      const quantityDisplay = `${detail.entryQuantityResult}개 (${detail.unit}${detail.boxNumber})`;
      
      const dataRow = worksheet.addRow([
        detail.productName,
        poNumber,
        detail.entryQuantity,      // "2종 x 5개 x 3세트"
        quantityDisplay            // "30개 (박스1)"
      ]);
      currentRow++;
    });
    
    // 5. 코드 그룹 사이 빈 행 (마지막 그룹이 아니면)
    if (groupIndex < codeGroups.length - 1) {
      worksheet.addRow([]);
      currentRow++;
    }
  });
  
  // 컬럼 너비 설정
  worksheet.columns = [
    { width: 25 }, // 제품명
    { width: 15 }, // 발주코드
    { width: 25 }, // 한박스 포장 구성
    { width: 20 }  // 한박스 수량
  ];
  
  // 파일 다운로드
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const today = new Date().toISOString().split('T')[0];
  link.download = `패킹리스트_내보내기_${today}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

