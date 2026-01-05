import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PaymentRequest } from '../api/paymentRequestApi';
import { formatDateKST, getLocalDateString } from './dateUtils';
import { addNanumGothicFontToPDF } from './fontLoader';

const SERVER_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

/**
 * 이미지 URL을 절대 경로로 변환
 */
function getFullImageUrl(imagePath: string | undefined | null): string | null {
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  return `${SERVER_BASE_URL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
}

/**
 * 이미지를 Base64로 변환
 */
async function imageToBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'include' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        resolve(typeof result === 'string' ? result : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('이미지 로드 실패:', url, error);
    return null;
  }
}

interface DateGroup {
  date: string;
  items: PaymentRequest[];
  totals: {
    advance: number;
    balance: number;
    shipping: number;
  };
}

/**
 * 지급요청 장부 PDF 생성 (단일 날짜 그룹)
 */
export async function generateSingleDateGroupPDF(group: DateGroup): Promise<void> {
  // A4 크기 PDF 생성 (포트레이트, 단위: mm)
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 15;
  let yPos = margin;

  // 한글 폰트 추가 시도
  const fontLoaded = await addNanumGothicFontToPDF(doc);
  const fontName = fontLoaded ? 'NanumGothic' : 'helvetica';

  // 제목
  doc.setFontSize(16);
  doc.setFont(fontName, fontLoaded ? 'normal' : 'bold');
  doc.text('지급요청 장부', margin, yPos);
  yPos += 10;
  
  // 생성일
  const currentDate = getLocalDateString();
  doc.setFontSize(9);
  doc.setFont(fontName, 'normal');
  doc.text(`생성일: ${formatDateKST(currentDate)}`, margin, yPos);
  yPos += 10;

  // 날짜 헤더
  doc.setFontSize(12);
  doc.setFont(fontName, fontLoaded ? 'normal' : 'bold');
  doc.text(formatDateKST(group.date), margin, yPos);
  yPos += 8;

  // 총계 정보
  doc.setFontSize(9);
  doc.setFont(fontName, 'normal');
  const totalsText = `선금: ¥${group.totals.advance.toLocaleString()}  잔금: ¥${group.totals.balance.toLocaleString()}  배송비: ¥${group.totals.shipping.toLocaleString()}  총계: ¥${(group.totals.advance + group.totals.balance + group.totals.shipping).toLocaleString()}`;
  // 텍스트가 페이지 너비를 초과하지 않도록 처리
  const splitText = doc.splitTextToSize(totalsText, pageWidth - margin * 2);
  doc.text(splitText, margin, yPos);
  yPos += splitText.length * 5 + 5;

  // 발주상품과 패킹리스트 분리
  const purchaseOrderItems = group.items.filter(
    item => item.source_type === 'purchase_order'
  );
  const packingListItems = group.items.filter(
    item => item.source_type === 'packing_list'
  );

  // 발주상품 테이블 생성
  if (purchaseOrderItems.length > 0) {
    if (yPos > pageHeight - 70) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(10);
    doc.setFont(fontName, fontLoaded ? 'normal' : 'bold');
    doc.text('발주상품 지급요청', margin, yPos);
    yPos += 8;

    // 이미지 먼저 로드
    const imagePromises = purchaseOrderItems.map(async (item) => {
      const imageUrl = item.source_info?.product_image;
      if (!imageUrl) return null;
      const fullUrl = getFullImageUrl(imageUrl);
      if (!fullUrl) return null;
      return await imageToBase64(fullUrl);
    });
    const images = await Promise.all(imagePromises);

    // 발주상품 테이블 데이터 준비
    const purchaseTableData: any[] = [];
    
    for (let i = 0; i < purchaseOrderItems.length; i++) {
      const item = purchaseOrderItems[i];
      const paymentTypeLabel = item.payment_type === 'advance' ? '선금' : '잔금';
      const productName = item.source_info?.product_name || '-';
      const poNumber = item.source_info?.po_number || item.source_id;
      const amount = `¥${item.amount.toLocaleString()}`;
      
      purchaseTableData.push([
        '', // 이미지는 didDrawCell에서 추가
        productName,
        poNumber,
        paymentTypeLabel,
        amount,
      ]);
    }

    // 테이블 생성
    autoTable(doc, {
      startY: yPos,
      head: [['이미지', '상품명', 'PO번호', '항목', '금액']],
      body: purchaseTableData,
      theme: 'striped',
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
        ...(fontLoaded ? { font: 'NanumGothic' } : {}),
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        ...(fontLoaded ? { font: 'NanumGothic' } : {}),
      },
      columnStyles: {
        0: { cellWidth: 20 }, // 이미지
        1: { cellWidth: 50 }, // 상품명
        2: { cellWidth: 35 }, // PO번호
        3: { cellWidth: 25 }, // 항목
        4: { cellWidth: 30, halign: 'right' }, // 금액
      },
      didDrawCell: (data: any) => {
        // 이미지 셀에 이미지 추가
        if (data.column.index === 0 && data.row.index > 0) {
          const rowIndex = data.row.index - 1; // 헤더 제외
          const imageBase64 = images[rowIndex];
          if (imageBase64 && data.cell) {
            try {
              const imageSize = 15;
              const imageX = data.cell.x + (data.cell.width / 2) - (imageSize / 2);
              const imageY = data.cell.y + (data.cell.height / 2) - (imageSize / 2);
              doc.addImage(imageBase64, 'JPEG', imageX, imageY, imageSize, imageSize);
            } catch (error) {
              console.error('이미지 추가 실패:', error);
            }
          }
        }
      },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // 패킹리스트 테이블 생성
  if (packingListItems.length > 0) {
    if (yPos > pageHeight - 70) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(10);
    doc.setFont(fontName, fontLoaded ? 'normal' : 'bold');
    doc.text('패킹리스트 배송비 지급요청', margin, yPos);
    yPos += 8;

    // 패킹리스트 테이블 데이터 준비
    const packingTableData = packingListItems.map(item => {
      const code = item.source_info?.packing_code || item.source_id;
      const shippingDate = item.source_info?.shipping_date 
        ? formatDateKST(item.source_info.shipping_date) 
        : '-';
      const amount = `¥${item.amount.toLocaleString()}`;
      
      return [code, shippingDate, amount];
    });

    // 패킹리스트 테이블 생성
    autoTable(doc, {
      startY: yPos,
      head: [['코드', '발송날짜', '금액']],
      body: packingTableData,
      theme: 'striped',
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
        ...(fontLoaded ? { font: 'NanumGothic' } : {}),
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        ...(fontLoaded ? { font: 'NanumGothic' } : {}),
      },
      columnStyles: {
        0: { cellWidth: 60 }, // 코드
        1: { cellWidth: 50 }, // 발송날짜
        2: { cellWidth: 50, halign: 'right' }, // 금액
      },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // PDF 다운로드
  const fileName = `지급요청장부_${group.date.replace(/-/g, '')}.pdf`;
  doc.save(fileName);
}

/**
 * 지급요청 장부 PDF 생성 (전체 날짜 그룹) - 호환성을 위해 유지
 */
export async function generatePaymentRequestLedgerPDF(dateGroups: DateGroup[]): Promise<void> {
  if (dateGroups.length === 0) return;
  // 단일 그룹 함수를 사용
  await generateSingleDateGroupPDF(dateGroups[0]);
}
