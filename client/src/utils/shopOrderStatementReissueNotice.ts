import type { ShopOrderLine } from '../api/shopOrderApi';
import type { ShopOrderLineForm } from './shopOrderCalculations';
import { lineHasStatement } from './shopOrderLineListUtils';

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
