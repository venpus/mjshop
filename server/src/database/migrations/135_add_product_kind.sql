-- 마이그레이션: 135_add_product_kind
-- 설명: 상품 구분 태그 (판매가능 / 재고조사)
-- 날짜: 2026-06-14

ALTER TABLE products
  ADD COLUMN product_kind ENUM('판매가능', '재고조사') NOT NULL DEFAULT '판매가능'
    COMMENT '상품 구분 태그'
    AFTER status;

CREATE INDEX idx_product_kind ON products (product_kind);
