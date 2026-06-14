-- 마이그레이션: 119_add_email_to_kr_shop_buyers
-- 설명: 구매자 이메일 주소 컬럼 추가
-- 날짜: 2026-06-14

ALTER TABLE kr_shop_buyers
  ADD COLUMN email VARCHAR(255) NULL COMMENT '이메일 주소' AFTER kakao_id,
  ADD INDEX idx_email (email);
