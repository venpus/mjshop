import type { ShopOrderLine } from '../api/shopOrderApi';
import type { ShopOrderLineForm } from './shopOrderCalculations';
import { lineHasStatement } from './shopOrderLineListUtils';
import { buildStatementRowGroupKey, type ShopOrderLineListRow } from './shopOrderListExport';
import { formatLineOrderRef } from './shopOrderLineListUtils';

const STATEMENT_AFFECTING_LINE_FIELDS = [
  'orderBoxCount',
  'quantityPerBox',
  'saleUnitPrice',
  'deliveryFee',
  'companyName',
  'address',
  'recipientName',
  'phoneNumber',
  'vatExempt',
] as const satisfies ReadonlyArray<keyof ShopOrderLineForm>;

function normalizeLineFieldValue(
  key: (typeof STATEMENT_AFFECTING_LINE_FIELDS)[number],
  value: unknown
): unknown {
  if (
    key === 'companyName' ||
    key === 'address' ||
    key === 'recipientName' ||
    key === 'phoneNumber'
  ) {
    return String(value ?? '').trim();
  }
  return value;
}

export function lineHasStatementFromForm(line: ShopOrderLineForm): boolean {
  return Boolean(line.statementFilePath);
}

export function lineStatementAffectingFieldsChanged(
  before: ShopOrderLineForm,
  after: ShopOrderLineForm
): boolean {
  return STATEMENT_AFFECTING_LINE_FIELDS.some(
    (key) =>
      normalizeLineFieldValue(key, before[key]) !== normalizeLineFieldValue(key, after[key])
  );
}

export function getLinesWithStatementAndAffectingChanges(
  beforeLines: ShopOrderLineForm[],
  afterLines: ShopOrderLineForm[]
): ShopOrderLineForm[] {
  const beforeMap = new Map(beforeLines.map((line) => [line.id, line]));
  const changed: ShopOrderLineForm[] = [];

  for (const after of afterLines) {
    const before = beforeMap.get(after.id);
    if (!before || !lineHasStatementFromForm(before)) {
      continue;
    }
    if (lineStatementAffectingFieldsChanged(before, after)) {
      changed.push(after);
    }
  }

  return changed;
}

export interface RelatedStatementRef {
  groupKey: string;
  isReservation: boolean;
  title: string;
  orderRefsLabel: string;
}

function formatStatementDateLabel(value: string | null | undefined): string {
  if (!value) return '-';
  return value.includes('T') ? value.split('T')[0] : value.slice(0, 10);
}

export function buildRelatedStatementTitle(
  row: ShopOrderLineListRow,
  lineCount: number
): string {
  const line = row.line;
  const companyName = (line.companyName ?? '').trim() || '미상';
  const dateLabel = formatStatementDateLabel(line.statementIssuedAt ?? row.orderDate);
  const kindLabel = line.isReservation ? '예약' : '주문';
  if (lineCount > 1) {
    return `${companyName} · ${dateLabel} (${kindLabel} 통합 ${lineCount}건)`;
  }
  return `${companyName} · ${dateLabel} (${kindLabel})`;
}

export function collectRelatedStatementRefsForLineSync(
  row: ShopOrderLineListRow,
  allRows: ShopOrderLineListRow[],
  updates: Partial<Pick<ShopOrderLine, 'deliveryFee' | 'vatExempt'>>
): RelatedStatementRef[] {
  if (!shouldNotifyStatementReissueForLineSync(row.line, updates)) {
    return [];
  }

  const groupKey = buildStatementRowGroupKey(row);
  const groupRows = allRows.filter((candidate) => buildStatementRowGroupKey(candidate) === groupKey);
  const representative = groupRows[0] ?? row;
  const orderRefsLabel = groupRows
    .map((groupRow) =>
      formatLineOrderRef(
        groupRow.line.lineOrderNumber,
        groupRow.orderNumber,
        groupRow.lineIndex,
        groupRow.line.isReservation ? '예약' : undefined
      )
    )
    .join(', ');

  return [
    {
      groupKey,
      isReservation: representative.line.isReservation,
      title: buildRelatedStatementTitle(representative, groupRows.length),
      orderRefsLabel: orderRefsLabel || '-',
    },
  ];
}

export function buildStatementChangeNoticeMessage(statementCount: number): string {
  const headline =
    statementCount > 1
      ? `${statementCount}건의 관련 명세서가 있습니다.`
      : '관련 명세서가 있습니다.';

  return [
    headline,
    '',
    '이 변경을 저장하면 관련 명세서가 자동으로 삭제됩니다.',
    '저장 전 아래 링크에서 명세서를 확인한 뒤, 변경 내용으로 다시 발급해 주세요.',
  ].join('\n');
}

export interface StatementReissueNoticeContext {
  beforeLines: ShopOrderLineForm[];
  afterLines: ShopOrderLineForm[];
  beforeQuantityPerBox: number;
  afterQuantityPerBox: number;
}

export function countStatementReissueAffectedLines({
  beforeLines,
  afterLines,
  beforeQuantityPerBox,
  afterQuantityPerBox,
}: StatementReissueNoticeContext): number {
  const changedLines = getLinesWithStatementAndAffectingChanges(beforeLines, afterLines);
  if (changedLines.length > 0) {
    return changedLines.length;
  }

  if (beforeQuantityPerBox === afterQuantityPerBox) {
    return 0;
  }

  return afterLines.filter((line) => lineHasStatementFromForm(line)).length;
}

export function buildStatementReissueNoticeMessage(affectedLineCount: number): string {
  const headline =
    affectedLineCount > 1
      ? `${affectedLineCount}건의 명세서가 발행된 주문 정보가 변경되었습니다.`
      : '명세서가 발행된 주문 정보가 변경되었습니다.';

  return [
    headline,
    '',
    '저장된 내용과 기존 명세서의 수량·금액·주소 등이 일치하지 않을 수 있습니다.',
    '관련 명세서를 취소(또는 목록에서 제거)한 뒤, 변경된 내용으로 명세서를 다시 발급해 주세요.',
  ].join('\n');
}

export function showStatementReissueNotice(affectedLineCount: number): void {
  if (affectedLineCount <= 0) {
    return;
  }
  window.alert(buildStatementReissueNoticeMessage(affectedLineCount));
}

export function shouldNotifyStatementReissueForLineSync(
  line: ShopOrderLine,
  updates: Partial<Pick<ShopOrderLine, 'deliveryFee' | 'vatExempt'>>
): boolean {
  if (!lineHasStatement(line)) {
    return false;
  }
  if (updates.deliveryFee !== undefined && updates.deliveryFee !== line.deliveryFee) {
    return true;
  }
  if (updates.vatExempt !== undefined && updates.vatExempt !== line.vatExempt) {
    return true;
  }
  return false;
}

export function notifyStatementReissueAfterFormSave(
  beforeLines: ShopOrderLineForm[],
  afterLines: ShopOrderLineForm[],
  beforeQuantityPerBox: number,
  afterQuantityPerBox: number
): void {
  const affectedCount = countStatementReissueAffectedLines({
    beforeLines,
    afterLines,
    beforeQuantityPerBox,
    afterQuantityPerBox,
  });
  showStatementReissueNotice(affectedCount);
}
