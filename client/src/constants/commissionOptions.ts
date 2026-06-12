export type CommissionOption = {
  label: string;
  rate: number;
};

export const COMMISSION_OPTIONS: CommissionOption[] = [
  { label: "0%", rate: 0 },
  { label: "5만위안 이상 재주문 5%", rate: 5 },
  { label: "5만위안 이하 재주문 7%", rate: 7 },
  { label: "5만위안 이상 신규주문 8%", rate: 8 },
  { label: "5만위안이하 신규주문 10%", rate: 10 },
];

/** 새 발주 생성 시 기본 수수료 옵션 */
export const DEFAULT_COMMISSION_OPTION = COMMISSION_OPTIONS[1];

export function resolveCommissionSelection(
  rate: number,
  type: string | null | undefined,
): CommissionOption {
  if (type) {
    const byType = COMMISSION_OPTIONS.find((opt) => opt.label === type);
    if (byType) return byType;
  }

  const byRate = COMMISSION_OPTIONS.find((opt) => opt.rate === rate);
  if (byRate) return byRate;

  return DEFAULT_COMMISSION_OPTION;
}
