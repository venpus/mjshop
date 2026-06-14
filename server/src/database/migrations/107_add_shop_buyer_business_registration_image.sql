-- 마이그레이션: 107_add_shop_buyer_business_registration_image
-- 설명: 구매자 사업자등록증 이미지 URL 컬럼 추가
-- 날짜: 2026-06-14

ALTER TABLE kr_shop_buyers
  ADD COLUMN business_registration_image VARCHAR(500) NULL COMMENT '사업자등록증 이미지 URL' AFTER business_registration_number;
