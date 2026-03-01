/**
 * 발주 상세 비용 입력 허용 사용자 ID 목록
 * 해당 영역(기본단가, 업체/창고배송비, 포장·가공 부자재 일반, 인건비 일반, 추가단가, 수량, 수수료율, 선금 비율)은
 * 이 목록에 있는 사용자만 입력·수정 가능합니다.
 */
export const COST_INPUT_ALLOWED_USER_IDS: string[] = ['venpus'];

export function isCostInputAllowed(userId: string | undefined): boolean {
  if (!userId) return false;
  return COST_INPUT_ALLOWED_USER_IDS.includes(userId);
}
