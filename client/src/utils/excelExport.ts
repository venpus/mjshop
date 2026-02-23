import ExcelJS from 'exceljs';
import { NotArrivedItem } from '../api/purchaseOrderApi';
import { getFullImageUrl } from '../api/purchaseOrderApi';

/**
 * 이미지 URL을 base64로 변환
 */
async function imageUrlToBase64(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('이미지 변환 실패:', error);
    throw error;
  }
}

/**
 * 한국 미도착 물품 분석 데이터를 엑셀로 내보내기
 */
export async function exportNotArrivedAnalysisToExcel(
  items: NotArrivedItem[],
  summary: {
    total_quantity: number;
    total_amount: number;
    not_arrived_quantity: number;
    not_arrived_amount: number;
  }
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('미도착 물품 분석');

  // 열 너비 설정
  worksheet.columns = [
    { width: 12 }, // 발주 날짜
    { width: 12 }, // 발주번호
    { width: 15 }, // 사진
    { width: 30 }, // 상품명
    { width: 12 }, // 납기일
    { width: 12 }, // 발주 수량
    { width: 12 }, // 미출고 수량
    { width: 12 }, // 한국 배송 중
    { width: 12 }, // 한국 도착
    { width: 15 }, // 단가
    { width: 15 }, // 총 금액
  ];

  // 헤더 행
  const headerRow = worksheet.addRow([
    '발주 날짜',
    '발주번호',
    '사진',
    '상품명',
    '납기일',
    '발주 수량',
    '미출고 수량',
    '한국 배송 중',
    '한국 도착',
    '단가',
    '총 금액',
  ]);

  // 헤더 스타일
  headerRow.font = { bold: true, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;

  // 데이터 행 추가
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const row = worksheet.addRow([
      item.order_date || '-',
      item.po_number,
      '', // 이미지는 별도로 추가
      item.product_name,
      item.estimated_delivery || '-',
      item.quantity,
      item.unreceived_quantity,
      item.shipping_quantity,
      item.arrived_quantity,
      item.order_unit_price || item.unit_price,
      item.total_amount,
    ]);

    // 행 높이 설정 (이미지용)
    row.height = 80;

    // 이미지 셀 처리 (3번째 열)
    const imageCell = row.getCell(3);
    if (item.product_main_image) {
      try {
        const imageUrl = getFullImageUrl(item.product_main_image);
        const base64Image = await imageUrlToBase64(imageUrl);
        
        // base64에서 데이터 부분만 추출
        const base64Data = base64Image.split(',')[1];
        
        // 브라우저 환경에서 base64를 Uint8Array로 변환
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let j = 0; j < binaryString.length; j++) {
          bytes[j] = binaryString.charCodeAt(j);
        }

        // 이미지 추가
        const imageId = workbook.addImage({
          buffer: bytes,
          extension: 'png',
        });

        worksheet.addImage(imageId, {
          tl: { col: 2, row: i + 1 }, // 0-based index, 헤더 행 제외
          ext: { width: 80, height: 80 },
        });
      } catch (error) {
        console.error(`이미지 추가 실패 (${item.po_number}):`, error);
        imageCell.value = '이미지 없음';
      }
    } else {
      imageCell.value = '이미지 없음';
    }

    // 숫자 형식 적용
    row.getCell(6).numFmt = '#,##0'; // 발주 수량
    row.getCell(7).numFmt = '#,##0'; // 미출고 수량
    row.getCell(8).numFmt = '#,##0'; // 한국 배송 중
    row.getCell(9).numFmt = '#,##0'; // 한국 도착
    row.getCell(10).numFmt = '#,##0.00'; // 단가
    row.getCell(11).numFmt = '#,##0.00'; // 총 금액

    // 정렬 설정
    row.getCell(1).alignment = { horizontal: 'center' }; // 발주 날짜
    row.getCell(2).alignment = { horizontal: 'center' }; // 발주번호
    row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' }; // 사진
    row.getCell(4).alignment = { horizontal: 'left' }; // 상품명
    row.getCell(5).alignment = { horizontal: 'center' }; // 납기일
    row.getCell(6).alignment = { horizontal: 'right' }; // 발주 수량
    row.getCell(7).alignment = { horizontal: 'right' }; // 미출고 수량
    row.getCell(8).alignment = { horizontal: 'right' }; // 한국 배송 중
    row.getCell(9).alignment = { horizontal: 'right' }; // 한국 도착
    row.getCell(10).alignment = { horizontal: 'right' }; // 단가
    row.getCell(11).alignment = { horizontal: 'right' }; // 총 금액

    // 색상 적용
    row.getCell(7).font = { color: { argb: 'FFFF6B00' } }; // 미출고 수량 - 주황색
    row.getCell(8).font = { color: { argb: 'FF0066CC' } }; // 한국 배송 중 - 파란색
    row.getCell(9).font = { color: { argb: 'FF00AA00' } }; // 한국 도착 - 초록색
  }

  // 합계 행 추가
  const summaryRow = worksheet.addRow([
    '',
    '합계',
    '',
    '',
    '',
    summary.total_quantity,
    summary.not_arrived_quantity,
    '',
    '',
    '',
    summary.total_amount,
  ]);

  summaryRow.font = { bold: true, size: 11 };
  summaryRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF3F4F6' },
  };
  summaryRow.getCell(6).numFmt = '#,##0';
  summaryRow.getCell(7).numFmt = '#,##0';
  summaryRow.getCell(11).numFmt = '#,##0.00';
  summaryRow.getCell(6).alignment = { horizontal: 'right' };
  summaryRow.getCell(7).alignment = { horizontal: 'right' };
  summaryRow.getCell(11).alignment = { horizontal: 'right' };

  // 엑셀 파일 다운로드
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `미도착_물품_분석_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

