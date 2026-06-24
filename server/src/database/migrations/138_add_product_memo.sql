-- 마이그레이션: 138_add_product_memo
-- 설명: 상품 카드 메모 필드
-- 날짜: 2026-06-14

ALTER TABLE products
  ADD COLUMN memo TEXT NULL COMMENT '상품 메모' AFTER ad_copy;
