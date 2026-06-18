import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SHOP_STATEMENT_SUPPLIER, SHOP_STATEMENT_VAT_EXEMPT_BANK } from '../config/shopStatementSupplier.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let cachedStatementSealDataUri: string | null | undefined;

function resolveStatementSealPath(): string | null {
  const candidates = [
    path.join(__dirname, '../../assets/shop-statement-seal-transparent.png'),
    path.join(__dirname, '../../assets/shop-statement-seal.png'),
    path.join(process.cwd(), 'assets/shop-statement-seal-transparent.png'),
    path.join(process.cwd(), 'assets/shop-statement-seal.png'),
    path.join(process.cwd(), 'server/assets/shop-statement-seal-transparent.png'),
    path.join(process.cwd(), 'server/assets/shop-statement-seal.png'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function getStatementSealDataUri(): string {
  if (cachedStatementSealDataUri !== undefined) {
    return cachedStatementSealDataUri ?? '';
  }

  const sealPath = resolveStatementSealPath();
  if (!sealPath) {
    console.warn('[shopOrderStatement] 도장 이미지를 찾을 수 없습니다.');
    cachedStatementSealDataUri = null;
    return '';
  }

  const buffer = fs.readFileSync(sealPath);
  cachedStatementSealDataUri = `data:image/png;base64,${buffer.toString('base64')}`;
  return cachedStatementSealDataUri;
}

export interface ShopOrderStatementContext {
  orderNumber: string;
  productName: string;
  orderDate: string | Date | null;
  quantityPerBox: number;
  companyName: string | null;
  orderBoxCount: number;
  saleUnitPrice: number | null;
  deliveryFee: number | null;
  address: string | null;
  recipientName: string | null;
  phoneNumber: string | null;
  isReservation?: boolean;
  vatExempt?: boolean;
  /** 명세서 거래일자 (미설정 시 orderDate 사용) */
  statementDate?: string | Date | null;
}

const BORDER = '#5a7a42';
const EMPTY_ITEM_ROWS = 2;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatWon(value: number): string {
  return `₩${Math.round(value).toLocaleString('ko-KR')}`;
}

function formatAmount(value: number): string {
  return Math.round(value).toLocaleString('ko-KR');
}

function normalizeDateString(value: string | Date | null | undefined): string {
  if (value == null) {
    return new Date().toISOString().slice(0, 10);
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return new Date().toISOString().slice(0, 10);
    }
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

function parseKoreanDate(value: string | Date | null | undefined): {
  full: string;
  month: string;
  day: string;
} {
  const raw = normalizeDateString(value);
  const [year, month, day] = raw.split('-').map((part) => Number(part));
  return {
    full: `${year}년 ${month}월 ${day}일`,
    month: String(month),
    day: String(day),
  };
}

function renderRegistrationDigits(registrationNumber: string): string {
  return registrationNumber
    .split('')
    .map((char) => {
      if (char === '-' || char === ' ') {
        return '<td class="reg-gap"></td>';
      }
      return `<td class="reg-digit">${escapeHtml(char)}</td>`;
    })
    .join('');
}

function buildAmounts(order: ShopOrderStatementContext) {
  const quantity = order.orderBoxCount * order.quantityPerBox;
  const productSupply = quantity * (order.saleUnitPrice ?? 0);
  const deliverySupply = order.deliveryFee ?? 0;
  const vatExempt = Boolean(order.vatExempt);
  const vatAmount = vatExempt ? 0 : Math.round(productSupply * 0.1);
  const supplyTotal = productSupply + deliverySupply;
  const grandTotal =
    (vatExempt ? productSupply : Math.round(productSupply * 1.1)) + deliverySupply;

  return {
    quantity,
    productSupply,
    deliverySupply,
    supplyTotal,
    vatAmount,
    grandTotal,
    unitPrice: order.saleUnitPrice ?? 0,
    vatExempt,
  };
}

function resolveStatementBankInfo(
  contexts: ShopOrderStatementContext | ShopOrderStatementContext[]
): { bankDepositInfo: string; bankDepositNotice: string } {
  const list = Array.isArray(contexts) ? contexts : [contexts];
  if (list.length > 0 && list.every((context) => context.vatExempt)) {
    return SHOP_STATEMENT_VAT_EXEMPT_BANK;
  }
  return {
    bankDepositInfo: SHOP_STATEMENT_SUPPLIER.bankDepositInfo,
    bankDepositNotice: SHOP_STATEMENT_SUPPLIER.bankDepositNotice,
  };
}

function formatStatementProductLabel(order: ShopOrderStatementContext): string {
  if (order.isReservation) {
    return `[예약] ${order.productName}`;
  }
  return order.productName;
}

function resolveStatementDocumentDate(
  context: ShopOrderStatementContext
): string | Date | null {
  return context.statementDate ?? context.orderDate;
}

function buildStatementTitleReservationNote(
  contexts: ShopOrderStatementContext | ShopOrderStatementContext[]
): string {
  const list = Array.isArray(contexts) ? contexts : [contexts];
  if (list.length === 0) return '';
  if (list.every((context) => context.isReservation)) {
    return ' · 예약';
  }
  if (list.some((context) => context.isReservation)) {
    return ' · 예약 포함';
  }
  return '';
}

function buildItemRows(
  order: ShopOrderStatementContext,
  date: { month: string; day: string },
  amounts: ReturnType<typeof buildAmounts>
): string {
  const rows: string[] = [];

  rows.push(`
    <tr class="item-row">
      <td class="center">${date.month}</td>
      <td class="center">${date.day}</td>
      <td>${escapeHtml(formatStatementProductLabel(order))}</td>
      <td class="center">${order.orderBoxCount}박스×${order.quantityPerBox}개</td>
      <td class="center">${formatAmount(amounts.quantity)}</td>
      <td class="right">${formatAmount(amounts.unitPrice)}</td>
      <td class="right">${formatAmount(amounts.productSupply)}</td>
      <td class="center">${escapeHtml(order.orderNumber)}</td>
    </tr>`);

  rows.push(`
    <tr class="item-row">
      <td class="center">${date.month}</td>
      <td class="center">${date.day}</td>
      <td>택배비</td>
      <td class="center">-</td>
      <td class="center">1</td>
      <td class="right">${amounts.deliverySupply > 0 ? formatAmount(amounts.deliverySupply) : '-'}</td>
      <td class="right">${amounts.deliverySupply > 0 ? formatAmount(amounts.deliverySupply) : '-'}</td>
      <td></td>
    </tr>`);

  if (!amounts.vatExempt) {
    rows.push(`
    <tr class="item-row vat-row">
      <td class="center">${date.month}</td>
      <td class="center">${date.day}</td>
      <td>부가세</td>
      <td></td>
      <td></td>
      <td></td>
      <td class="right">${formatAmount(amounts.vatAmount)}</td>
      <td></td>
    </tr>`);
  }

  for (let i = 0; i < EMPTY_ITEM_ROWS; i += 1) {
    rows.push(`
    <tr class="item-row empty-row">
      <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
    </tr>`);
  }

  return rows.join('');
}

function pickLatestOrderDate(
  contexts: ShopOrderStatementContext[]
): string | Date | null {
  let latestTime = -Infinity;
  let latestValue: string | Date | null = null;

  for (const context of contexts) {
    const normalized = normalizeDateString(context.orderDate);
    const time = new Date(normalized).getTime();
    if (Number.isNaN(time)) continue;
    if (time >= latestTime) {
      latestTime = time;
      latestValue = context.orderDate;
    }
  }

  return latestValue;
}

function buildConsolidatedAmounts(contexts: ShopOrderStatementContext[]) {
  let productSupply = 0;
  let deliverySupply = 0;
  let vatAmount = 0;
  let grandTotal = 0;

  for (const context of contexts) {
    const amounts = buildAmounts(context);
    productSupply += amounts.productSupply;
    deliverySupply += amounts.deliverySupply;
    vatAmount += amounts.vatAmount;
    grandTotal += amounts.grandTotal;
  }

  return {
    productSupply,
    deliverySupply,
    supplyTotal: productSupply + deliverySupply,
    vatAmount,
    grandTotal,
    vatExempt: contexts.every((context) => context.vatExempt),
  };
}

function buildConsolidatedItemRows(
  contexts: ShopOrderStatementContext[],
  headerDate: { month: string; day: string }
): string {
  const rows: string[] = [];
  const consolidated = buildConsolidatedAmounts(contexts);

  for (const context of contexts) {
    const lineDate = parseKoreanDate(context.orderDate);
    const amounts = buildAmounts(context);

    rows.push(`
    <tr class="item-row">
      <td class="center">${lineDate.month}</td>
      <td class="center">${lineDate.day}</td>
      <td>${escapeHtml(formatStatementProductLabel(context))}</td>
      <td class="center">${context.orderBoxCount}박스×${context.quantityPerBox}개</td>
      <td class="center">${formatAmount(amounts.quantity)}</td>
      <td class="right">${formatAmount(amounts.unitPrice)}</td>
      <td class="right">${formatAmount(amounts.productSupply)}</td>
      <td class="center">${escapeHtml(context.orderNumber)}</td>
    </tr>`);
  }

  rows.push(`
    <tr class="item-row">
      <td class="center">${headerDate.month}</td>
      <td class="center">${headerDate.day}</td>
      <td>택배비</td>
      <td class="center">-</td>
      <td class="center">1</td>
      <td class="right">${consolidated.deliverySupply > 0 ? formatAmount(consolidated.deliverySupply) : '-'}</td>
      <td class="right">${consolidated.deliverySupply > 0 ? formatAmount(consolidated.deliverySupply) : '-'}</td>
      <td></td>
    </tr>`);

  if (!consolidated.vatExempt) {
    rows.push(`
    <tr class="item-row vat-row">
      <td class="center">${headerDate.month}</td>
      <td class="center">${headerDate.day}</td>
      <td>부가세</td>
      <td></td>
      <td></td>
      <td></td>
      <td class="right">${formatAmount(consolidated.vatAmount)}</td>
      <td></td>
    </tr>`);
  }

  for (let i = 0; i < EMPTY_ITEM_ROWS; i += 1) {
    rows.push(`
    <tr class="item-row empty-row">
      <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
    </tr>`);
  }

  return rows.join('');
}

export function buildShopOrderConsolidatedStatementHtml(
  contexts: ShopOrderStatementContext[]
): string {
  if (contexts.length === 0) {
    throw new Error('명세서를 생성할 주문 라인이 없습니다.');
  }

  if (contexts.length === 1) {
    return buildShopOrderStatementHtml(contexts[0]);
  }

  const recipient = contexts[0];
  const supplier = SHOP_STATEMENT_SUPPLIER;
  const date = parseKoreanDate(resolveStatementDocumentDate(recipient));
  const amounts = buildConsolidatedAmounts(contexts);
  const regDigits = renderRegistrationDigits(
    supplier.registrationNumber.replace(/\s/g, '')
  );
  const itemRows = buildConsolidatedItemRows(contexts, date);
  const sealDataUri = getStatementSealDataUri();
  const sealMarkup = sealDataUri
    ? `<img class="statement-seal" src="${sealDataUri}" alt="" aria-hidden="true" />`
    : '';
  const titleLabel = `${recipient.companyName || '거래명세표'} (통합 ${contexts.length}건)`;
  const reservationNote = buildStatementTitleReservationNote(contexts);
  const bankInfo = resolveStatementBankInfo(contexts);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>거래명세표 ${escapeHtml(titleLabel)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
      color: #111;
      margin: 0;
      padding: 16px;
      background: #fff;
      font-weight: 700;
    }
    .sheet {
      max-width: 980px;
      margin: 0 auto;
      border: 2px solid ${BORDER};
    }
    .sheet td,
    .sheet th {
      font-weight: 700;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    td, th {
      border: 1px solid ${BORDER};
      padding: 6px 8px;
      font-size: 15px;
      font-weight: 700;
      vertical-align: middle;
      word-break: keep-all;
      line-height: 1.35;
    }
    .header-table td {
      height: 72px;
      vertical-align: middle;
    }
    .date-box {
      width: 180px;
      text-align: center;
      font-size: 16px;
      font-weight: 700;
      line-height: 1.5;
    }
    .title-box {
      text-align: center;
      font-size: 32px;
      font-weight: 800;
      letter-spacing: 0.35em;
      color: ${BORDER};
    }
    .title-sub {
      display: block;
      margin-top: 6px;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: #333;
    }
    .party-label {
      width: 28px;
      writing-mode: vertical-rl;
      text-orientation: upright;
      text-align: center;
      font-weight: 800;
      font-size: 14px;
      letter-spacing: 0.2em;
      background: #fafdf8;
    }
    .party-field-label {
      width: 92px;
      text-align: center;
      background: #fafdf8;
      font-size: 14px;
      font-weight: 700;
    }
    .party-value {
      font-size: 16px;
      font-weight: 700;
      padding: 8px 10px;
    }
    .recipient-name {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .recipient-name .company {
      font-size: 18px;
      font-weight: 800;
    }
    .recipient-name .honorific {
      font-size: 16px;
      font-weight: 700;
      white-space: nowrap;
    }
    .total-amount {
      font-size: 26px;
      font-weight: 800;
      padding: 10px 12px;
    }
    .reg-table {
      width: 100%;
      border-collapse: collapse;
    }
    .reg-table td {
      border: none;
      padding: 0 2px;
      text-align: center;
      font-size: 15px;
      font-weight: 800;
    }
    .reg-gap {
      width: 8px;
    }
    .items-table th {
      text-align: center;
      background: #fafdf8;
      font-size: 14px;
      font-weight: 800;
      padding: 8px 6px;
    }
    .items-table .center { text-align: center; }
    .items-table .right { text-align: right; padding-right: 10px; }
    .items-table .item-row td { height: 36px; }
    .items-table .vat-row td { background: #fffef5; }
    .items-table .empty-row td { height: 36px; }
    .footer-wrap {
      position: relative;
    }
    .footer-table td {
      height: 40px;
      font-size: 15px;
      font-weight: 700;
    }
    .footer-label {
      width: 72px;
      text-align: center;
      background: #fafdf8;
      font-weight: 800;
    }
    .pay-option {
      width: 48px;
      text-align: center;
      font-size: 14px;
    }
    .grand-total {
      text-align: right;
      font-size: 22px;
      font-weight: 800;
      padding-right: 12px;
    }
    .statement-seal {
      position: absolute;
      z-index: 20;
      pointer-events: none;
      width: 128px;
      height: auto;
      top: 28%;
      left: 46%;
      transform: translate(-50%, -50%);
      opacity: 0.95;
    }
    .bank-notice {
      padding: 14px 16px 18px;
      font-size: 16px;
      font-weight: 800;
      line-height: 1.65;
      border-top: 1px solid ${BORDER};
    }
    .bank-notice p {
      margin: 0;
    }
    .bank-notice p + p {
      margin-top: 6px;
    }
    @media print {
      body { padding: 0; }
      .sheet { max-width: none; border-width: 2px; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <table class="header-table">
      <tr>
        <td class="date-box">
          <div>거 래 일 자</div>
          <div>${date.full}</div>
        </td>
        <td class="title-box">
          거 래 명 세 표
          <span class="title-sub">(공급받는자용 · 통합 ${contexts.length}건${reservationNote})</span>
        </td>
        <td style="width:180px"></td>
      </tr>
    </table>

    <table>
      <tr>
        <td class="party-label" rowspan="5">공급받는자</td>
        <td class="party-field-label">상호(법인명)</td>
        <td class="party-value" colspan="3">
          <div class="recipient-name">
            <span class="company">${escapeHtml(recipient.companyName || '-')}</span>
            <span class="honorific">귀하</span>
          </div>
        </td>
        <td class="party-label" rowspan="5">공급자</td>
        <td class="party-field-label">등록번호</td>
        <td class="party-value" colspan="3">
          <table class="reg-table"><tr>${regDigits}</tr></table>
        </td>
      </tr>
      <tr>
        <td class="party-field-label">사업장주소</td>
        <td class="party-value" colspan="3">${escapeHtml(recipient.address || '-')}</td>
        <td class="party-field-label">상호(법인명)</td>
        <td class="party-value" colspan="3">${escapeHtml(supplier.companyName)}</td>
      </tr>
      <tr>
        <td class="party-field-label">전화번호</td>
        <td class="party-value" colspan="3">${escapeHtml(recipient.phoneNumber || '')}</td>
        <td class="party-field-label">성명</td>
        <td class="party-value" colspan="3">${escapeHtml(supplier.representativeName)}</td>
      </tr>
      <tr>
        <td class="party-field-label">합계금액</td>
        <td class="party-value total-amount" colspan="3">${formatWon(amounts.grandTotal)}</td>
        <td class="party-field-label">사업장주소</td>
        <td class="party-value" colspan="3">${escapeHtml(supplier.address)}</td>
      </tr>
      <tr>
        <td class="party-field-label">택배비</td>
        <td class="party-value" colspan="3">${
          amounts.deliverySupply > 0 ? formatWon(amounts.deliverySupply) : '-'
        }</td>
        <td class="party-field-label">전화</td>
        <td class="party-value">${escapeHtml(supplier.phone)}</td>
        <td class="party-field-label" style="width:48px">팩스</td>
        <td class="party-value">${escapeHtml(supplier.fax)}</td>
      </tr>
    </table>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width:36px">월</th>
          <th style="width:36px">일</th>
          <th style="width:24%">품목</th>
          <th style="width:12%">규격</th>
          <th style="width:8%">수량</th>
          <th style="width:12%">단가</th>
          <th style="width:12%">금액</th>
          <th>주문번호</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div class="footer-wrap">
      ${sealMarkup}
      <table class="footer-table">
      <tr>
        <td class="footer-label">인수자</td>
        <td>${escapeHtml(recipient.recipientName || '')}</td>
        <td class="footer-label">납품자</td>
        <td colspan="3">${escapeHtml(supplier.delivererName)}</td>
        <td class="pay-option">월결</td>
        <td class="pay-option">현금</td>
        <td class="pay-option">신용</td>
        <td class="pay-option">미수</td>
      </tr>
      <tr>
        <td class="footer-label">소계</td>
        <td colspan="7"></td>
        <td class="grand-total" colspan="2">${formatWon(amounts.grandTotal)}</td>
      </tr>
    </table>
    </div>

    <div class="bank-notice">
      <p>${escapeHtml(bankInfo.bankDepositInfo)}</p>
      <p>${escapeHtml(bankInfo.bankDepositNotice)}</p>
    </div>
  </div>
</body>
</html>`;
}

export function getConsolidatedShopOrderStatementFileName(
  companyName: string,
  lineCount: number,
  statementDate?: string | Date | null
): string {
  const safeName = (companyName || '미상').replace(/[^\w가-힣-]+/g, '_').slice(0, 40);
  const dateSuffix = normalizeDateString(statementDate ?? new Date()).replace(/-/g, '');
  const suffix = lineCount > 1 ? '_통합' : '';
  return `거래명세표_${safeName}_${dateSuffix}${suffix}.html`;
}

export function buildShopOrderStatementHtml(order: ShopOrderStatementContext): string {
  const supplier = SHOP_STATEMENT_SUPPLIER;
  const date = parseKoreanDate(resolveStatementDocumentDate(order));
  const amounts = buildAmounts(order);
  const regDigits = renderRegistrationDigits(
    supplier.registrationNumber.replace(/\s/g, '')
  );
  const itemRows = buildItemRows(order, date, amounts);
  const sealDataUri = getStatementSealDataUri();
  const sealMarkup = sealDataUri
    ? `<img class="statement-seal" src="${sealDataUri}" alt="" aria-hidden="true" />`
    : '';
  const reservationNote = buildStatementTitleReservationNote(order);
  const bankInfo = resolveStatementBankInfo(order);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>거래명세표 ${escapeHtml(order.orderNumber)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
      color: #111;
      margin: 0;
      padding: 16px;
      background: #fff;
      font-weight: 700;
    }
    .sheet {
      max-width: 980px;
      margin: 0 auto;
      border: 2px solid ${BORDER};
    }
    .sheet td,
    .sheet th {
      font-weight: 700;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    td, th {
      border: 1px solid ${BORDER};
      padding: 6px 8px;
      font-size: 15px;
      font-weight: 700;
      vertical-align: middle;
      word-break: keep-all;
      line-height: 1.35;
    }
    .header-table td {
      height: 72px;
      vertical-align: middle;
    }
    .date-box {
      width: 180px;
      text-align: center;
      font-size: 16px;
      font-weight: 700;
      line-height: 1.5;
    }
    .title-box {
      text-align: center;
      font-size: 32px;
      font-weight: 800;
      letter-spacing: 0.35em;
      color: ${BORDER};
    }
    .title-sub {
      display: block;
      margin-top: 6px;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: #333;
    }
    .party-label {
      width: 28px;
      writing-mode: vertical-rl;
      text-orientation: upright;
      text-align: center;
      font-weight: 800;
      font-size: 14px;
      letter-spacing: 0.2em;
      background: #fafdf8;
    }
    .party-field-label {
      width: 92px;
      text-align: center;
      background: #fafdf8;
      font-size: 14px;
      font-weight: 700;
    }
    .party-value {
      font-size: 16px;
      font-weight: 700;
      padding: 8px 10px;
    }
    .recipient-name {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .recipient-name .company {
      font-size: 18px;
      font-weight: 800;
    }
    .recipient-name .honorific {
      font-size: 16px;
      font-weight: 700;
      white-space: nowrap;
    }
    .total-amount {
      font-size: 26px;
      font-weight: 800;
      padding: 10px 12px;
    }
    .reg-table {
      width: 100%;
      border-collapse: collapse;
    }
    .reg-table td {
      border: 1px solid ${BORDER};
      padding: 0;
      text-align: center;
    }
    .reg-digit {
      width: 20px;
      height: 28px;
      font-size: 14px;
      font-weight: 700;
    }
    .reg-gap {
      width: 10px;
      border-left: none !important;
      border-right: none !important;
      background: #fff;
    }
    .items-table th {
      text-align: center;
      background: #fafdf8;
      font-size: 15px;
      font-weight: 800;
      height: 40px;
    }
    .items-table .item-row td {
      height: 38px;
      font-size: 15px;
      font-weight: 700;
    }
    .items-table .empty-row td {
      height: 34px;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .footer-table td {
      height: 44px;
      font-size: 15px;
      font-weight: 700;
    }
    .footer-label {
      width: 70px;
      text-align: center;
      background: #fafdf8;
      font-weight: 800;
    }
    .pay-option {
      width: 52px;
      text-align: center;
      background: #fafdf8;
      font-size: 14px;
      font-weight: 700;
    }
    .grand-total {
      text-align: right;
      font-size: 26px;
      font-weight: 800;
      padding-right: 12px;
    }
    .footer-wrap {
      position: relative;
      overflow: visible;
    }
    .statement-seal {
      position: absolute;
      z-index: 20;
      pointer-events: none;
      width: 128px;
      height: auto;
      top: 28%;
      left: 46%;
      transform: translate(-50%, -50%);
      opacity: 0.95;
    }
    .bank-notice {
      padding: 14px 16px 18px;
      font-size: 16px;
      font-weight: 800;
      line-height: 1.65;
      border-top: 1px solid ${BORDER};
    }
    .bank-notice p {
      margin: 0;
    }
    .bank-notice p + p {
      margin-top: 6px;
    }
    @media print {
      body { padding: 0; }
      .sheet { max-width: none; border-width: 2px; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <table class="header-table">
      <tr>
        <td class="date-box">
          <div>거 래 일 자</div>
          <div>${date.full}</div>
        </td>
        <td class="title-box">
          거 래 명 세 표
          <span class="title-sub">(공급받는자용${reservationNote})</span>
        </td>
        <td style="width:180px"></td>
      </tr>
    </table>

    <table>
      <tr>
        <td class="party-label" rowspan="5">공급받는자</td>
        <td class="party-field-label">상호(법인명)</td>
        <td class="party-value" colspan="3">
          <div class="recipient-name">
            <span class="company">${escapeHtml(order.companyName || '-')}</span>
            <span class="honorific">귀하</span>
          </div>
        </td>
        <td class="party-label" rowspan="5">공급자</td>
        <td class="party-field-label">등록번호</td>
        <td class="party-value" colspan="3">
          <table class="reg-table"><tr>${regDigits}</tr></table>
        </td>
      </tr>
      <tr>
        <td class="party-field-label">사업장주소</td>
        <td class="party-value" colspan="3">${escapeHtml(order.address || '-')}</td>
        <td class="party-field-label">상호(법인명)</td>
        <td class="party-value" colspan="3">${escapeHtml(supplier.companyName)}</td>
      </tr>
      <tr>
        <td class="party-field-label">전화번호</td>
        <td class="party-value" colspan="3">${escapeHtml(order.phoneNumber || '')}</td>
        <td class="party-field-label">성명</td>
        <td class="party-value" colspan="3">${escapeHtml(supplier.representativeName)}</td>
      </tr>
      <tr>
        <td class="party-field-label">합계금액</td>
        <td class="party-value total-amount" colspan="3">${formatWon(amounts.grandTotal)}</td>
        <td class="party-field-label">사업장주소</td>
        <td class="party-value" colspan="3">${escapeHtml(supplier.address)}</td>
      </tr>
      <tr>
        <td class="party-field-label">택배비</td>
        <td class="party-value" colspan="3">${
          amounts.deliverySupply > 0 ? formatWon(amounts.deliverySupply) : '-'
        }</td>
        <td class="party-field-label">전화</td>
        <td class="party-value">${escapeHtml(supplier.phone)}</td>
        <td class="party-field-label" style="width:48px">팩스</td>
        <td class="party-value">${escapeHtml(supplier.fax)}</td>
      </tr>
    </table>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width:36px">월</th>
          <th style="width:36px">일</th>
          <th style="width:24%">품목</th>
          <th style="width:12%">규격</th>
          <th style="width:8%">수량</th>
          <th style="width:12%">단가</th>
          <th style="width:12%">금액</th>
          <th>주문번호</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div class="footer-wrap">
      ${sealMarkup}
      <table class="footer-table">
      <tr>
        <td class="footer-label">인수자</td>
        <td>${escapeHtml(order.recipientName || '')}</td>
        <td class="footer-label">납품자</td>
        <td colspan="3">${escapeHtml(supplier.delivererName)}</td>
        <td class="pay-option">월결</td>
        <td class="pay-option">현금</td>
        <td class="pay-option">신용</td>
        <td class="pay-option">미수</td>
      </tr>
      <tr>
        <td class="footer-label">소계</td>
        <td colspan="7"></td>
        <td class="grand-total" colspan="2">${formatWon(amounts.grandTotal)}</td>
      </tr>
    </table>
    </div>

    <div class="bank-notice">
      <p>${escapeHtml(bankInfo.bankDepositInfo)}</p>
      <p>${escapeHtml(bankInfo.bankDepositNotice)}</p>
    </div>
  </div>
</body>
</html>`;
}

export function getShopOrderStatementFileName(displayNumber: string): string {
  const safeNumber = displayNumber.replace(/[^\w-]+/g, '_');
  return `거래명세표_${safeNumber}.html`;
}
