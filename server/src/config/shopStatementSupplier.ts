/**
 * 거래명세표 공급자(발행자) 정보 — 환경변수로 덮어쓸 수 있습니다.
 */
export const SHOP_STATEMENT_SUPPLIER = {
  registrationNumber:
    process.env.SHOP_SUPPLIER_REG_NO?.trim() || '536-86-01123',
  companyName: process.env.SHOP_SUPPLIER_NAME?.trim() || '주식회사 스키머즈',
  representativeName: process.env.SHOP_SUPPLIER_CEO?.trim() || '양태영',
  address:
    process.env.SHOP_SUPPLIER_ADDRESS?.trim() ||
    '경기도 고양시 덕양구 향동로 128, 6층 603호',
  phone: process.env.SHOP_SUPPLIER_PHONE?.trim() || '010-7419-1252',
  fax: process.env.SHOP_SUPPLIER_FAX?.trim() || '',
  delivererName:
    process.env.SHOP_SUPPLIER_DELIVERER?.trim() || '주식회사 스키머즈',
  bankDepositInfo:
    process.env.SHOP_SUPPLIER_BANK?.trim() ||
    '우리은행 1005-803-472390 주식회사 스키머즈',
  bankDepositNotice:
    process.env.SHOP_SUPPLIER_BANK_NOTICE?.trim() ||
    '입금 후 입금자명을 김부장에게 반드시 확인해 주세요.',
};
