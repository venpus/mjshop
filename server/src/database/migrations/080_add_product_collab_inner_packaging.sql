-- 마이그레이션: 080_add_product_collab_inner_packaging
-- 설명: 제품 스펙에 소포장 방식(inner_packaging) 컬럼 추가
-- 날짜: 2025-03-08

ALTER TABLE product_collab_products
  ADD COLUMN inner_packaging VARCHAR(255) NULL COMMENT '소포장 방식' AFTER packaging;
