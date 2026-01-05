import { PaymentRequest } from '../api/paymentRequestApi';
import { formatDateKST, getLocalDateString } from './dateUtils';

const SERVER_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

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
 * 이미지 URL을 절대 경로로 변환
 */
function getFullImageUrl(imagePath: string | undefined | null): string {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  return `${SERVER_BASE_URL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
}

/**
 * 지급요청 장부 인쇄 (브라우저 인쇄 기능 사용)
 */
export function printPaymentRequestLedger(group: DateGroup): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('팝업이 차단되어 있습니다. 팝업을 허용해주세요.');
    return;
  }

  // 발주상품과 패킹리스트 분리
  const purchaseOrderItems = group.items.filter(
    item => item.source_type === 'purchase_order'
  );
  const packingListItems = group.items.filter(
    item => item.source_type === 'packing_list'
  );

  const totalAmount = group.totals.advance + group.totals.balance + group.totals.shipping;

  // HTML 콘텐츠 생성
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>지급요청 장부 - ${formatDateKST(group.date)}</title>
      <meta charset="UTF-8">
      <style>
        @page {
          size: A4;
          margin: 20mm;
        }
        body {
          font-family: 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif;
          font-size: 12px;
          line-height: 1.4;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .print-header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 15px;
        }
        .print-title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .print-subtitle {
          font-size: 16px;
          color: #666;
        }
        .print-summary {
          display: flex;
          justify-content: space-around;
          margin-bottom: 30px;
          padding: 15px;
          background-color: #f8f9fa;
          border: 1px solid #dee2e6;
        }
        .summary-item {
          text-align: center;
        }
        .summary-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 5px;
        }
        .summary-value {
          font-size: 18px;
          font-weight: bold;
          color: #333;
        }
        .section {
          margin-bottom: 30px;
          border: 2px solid #000;
          border-radius: 8px;
          overflow: hidden;
        }
        .section-header {
          padding: 12px 16px;
          font-weight: bold;
          font-size: 14px;
          color: white;
          background-color: #4285f4;
        }
        .section-content {
          background-color: white;
        }
        .print-table {
          width: 100%;
          border-collapse: collapse;
          margin: 0;
        }
        .print-table th,
        .print-table td {
          border: 1px solid #000;
          padding: 8px;
          text-align: left;
          vertical-align: top;
        }
        .print-table th {
          background-color: #f8f9fa;
          font-weight: bold;
          text-align: center;
          border-bottom: 2px solid #000;
        }
        .print-table tbody tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .print-table .image-col {
          width: 15%;
          text-align: center;
        }
        .print-table .product-col {
          width: 25%;
        }
        .print-table .code-col {
          width: 20%;
        }
        .print-table .amount-col {
          width: 15%;
          text-align: right;
        }
        .print-table .date-col {
          width: 15%;
          text-align: center;
        }
        .print-table .type-col {
          width: 10%;
          text-align: center;
        }
        .product-image {
          width: 40px;
          height: 40px;
          object-fit: cover;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .product-image-placeholder {
          width: 40px;
          height: 40px;
          background-color: #f5f5f5;
          border: 1px solid #ddd;
          border-radius: 4px;
          display: inline-block;
        }
        .product-name {
          font-weight: bold;
          margin-bottom: 5px;
        }
        .product-code {
          font-size: 10px;
          color: #666;
        }
        .amount {
          font-weight: bold;
        }
        .no-data {
          text-align: center;
          padding: 40px;
          color: #666;
          font-style: italic;
        }
        .print-footer {
          margin-top: 30px;
          text-align: center;
          font-size: 10px;
          color: #666;
          border-top: 1px solid #dee2e6;
          padding-top: 10px;
        }
        @media print {
          .print-table th,
          .print-table td {
            border: 1px solid #000 !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .print-table th {
            background-color: #f8f9fa !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .section {
            border: 2px solid #000 !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .section-header {
            background-color: #4285f4 !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .print-summary {
            background-color: #f8f9fa !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      </style>
    </head>
    <body>
      <!-- 헤더 -->
      <div class="print-header">
        <div class="print-title">지급요청 장부</div>
        <div class="print-subtitle">
          요청일자: ${formatDateKST(group.date)}
        </div>
      </div>

      <!-- 요약 정보 -->
      <div class="print-summary">
        <div class="summary-item">
          <div class="summary-label">선금 요청</div>
          <div class="summary-value">
            ${group.totals.advance > 0 ? `¥${group.totals.advance.toLocaleString()}` : '¥0'}
          </div>
        </div>
        <div class="summary-item">
          <div class="summary-label">잔금 요청</div>
          <div class="summary-value">
            ${group.totals.balance > 0 ? `¥${group.totals.balance.toLocaleString()}` : '¥0'}
          </div>
        </div>
        <div class="summary-item">
          <div class="summary-label">배송비 요청</div>
          <div class="summary-value">
            ${group.totals.shipping > 0 ? `¥${group.totals.shipping.toLocaleString()}` : '¥0'}
          </div>
        </div>
        <div class="summary-item">
          <div class="summary-label">총 요청 금액</div>
          <div class="summary-value">¥${totalAmount.toLocaleString()}</div>
        </div>
      </div>

      ${purchaseOrderItems.length > 0 ? `
        <!-- 발주상품 지급요청 섹션 -->
        <div class="section">
          <div class="section-header">
            발주상품 지급요청 (${purchaseOrderItems.length}건)
          </div>
          <div class="section-content">
            <table class="print-table">
              <thead>
                <tr>
                  <th class="image-col">이미지</th>
                  <th class="product-col">상품명</th>
                  <th class="code-col">PO번호</th>
                  <th class="type-col">항목</th>
                  <th class="amount-col">금액</th>
                </tr>
              </thead>
              <tbody>
                ${purchaseOrderItems.map(item => {
                  const imageUrl = item.source_info?.product_image 
                    ? getFullImageUrl(item.source_info.product_image) 
                    : '';
                  const productName = item.source_info?.product_name || '-';
                  const poNumber = item.source_info?.po_number || item.source_id;
                  const paymentTypeLabel = item.payment_type === 'advance' ? '선금' : '잔금';
                  const amount = item.amount.toLocaleString();
                  
                  return `
                    <tr>
                      <td class="image-col">
                        ${imageUrl 
                          ? `<img src="${imageUrl}" alt="${productName}" class="product-image" onerror="this.style.display='none';" />` 
                          : '<div class="product-image-placeholder">📦</div>'}
                      </td>
                      <td class="product-col">
                        <div class="product-name">${productName}</div>
                        <div class="product-code">PO: ${poNumber}</div>
                      </td>
                      <td class="code-col">${poNumber}</td>
                      <td class="type-col">${paymentTypeLabel}</td>
                      <td class="amount-col">¥${amount}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      ${packingListItems.length > 0 ? `
        <!-- 패킹리스트 배송비 지급요청 섹션 -->
        <div class="section">
          <div class="section-header">
            패킹리스트 배송비 지급요청 (${packingListItems.length}건)
          </div>
          <div class="section-content">
            <table class="print-table">
              <thead>
                <tr>
                  <th class="code-col">코드</th>
                  <th class="date-col">발송날짜</th>
                  <th class="amount-col">금액</th>
                </tr>
              </thead>
              <tbody>
                ${packingListItems.map(item => {
                  const code = item.source_info?.packing_code || item.source_id;
                  const shippingDate = item.source_info?.shipping_date 
                    ? formatDateKST(item.source_info.shipping_date) 
                    : '-';
                  const amount = item.amount.toLocaleString();
                  
                  return `
                    <tr>
                      <td class="code-col">${code}</td>
                      <td class="date-col">${shippingDate}</td>
                      <td class="amount-col">¥${amount}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      <!-- 푸터 -->
      <div class="print-footer">
        <p>인쇄일시: ${new Date().toLocaleString('ko-KR')}</p>
        <p>지급요청 관리 시스템</p>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();

  // 인쇄 대화상자 열기
  setTimeout(() => {
    printWindow.print();
    // 인쇄 후 창 닫기 (사용자가 PDF로 저장하면 자동으로 닫힘)
    setTimeout(() => {
      printWindow.close();
    }, 1000);
  }, 500);
}

