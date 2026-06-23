-- 마이그레이션: 136_add_product_kind_sold
-- 설명: 상품 구분 태그에 판매완료 추가
-- 날짜: 2026-06-14

ALTER TABLE products
  MODIFY COLUMN product_kind ENUM('판매가능', '재고조사', '판매완료') NOT NULL DEFAULT '판매가능'
    COMMENT '상품 구분 태그';
