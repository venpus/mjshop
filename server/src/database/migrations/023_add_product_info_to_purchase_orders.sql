-- 마이그레이션: 023_add_product_info_to_purchase_orders
-- 설명: purchase_orders 테이블에 상품 정보 컬럼 추가 및 외래키 제약 제거
-- 날짜: 2024-12-24
-- 주의: 기존 데이터는 수동으로 삭제 예정

-- 1. 외래키 제약 제거 (product_id)
-- 먼저 외래키 이름 확인 필요
SET @fk_name = (
  SELECT CONSTRAINT_NAME 
  FROM information_schema.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'purchase_orders'
    AND COLUMN_NAME = 'product_id'
    AND REFERENCED_TABLE_NAME IS NOT NULL
  LIMIT 1
);

SET @sql = CONCAT('ALTER TABLE purchase_orders DROP FOREIGN KEY ', @fk_name);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. product_id를 NULL 허용으로 변경
ALTER TABLE purchase_orders 
MODIFY COLUMN product_id VARCHAR(50) NULL COMMENT '상품 ID (더 이상 사용하지 않음)';

-- 3. 상품 정보 컬럼 추가
ALTER TABLE purchase_orders
ADD COLUMN product_name VARCHAR(255) NOT NULL DEFAULT '' COMMENT '상품명',
ADD COLUMN product_name_chinese VARCHAR(255) NULL COMMENT '중문 상품명',
ADD COLUMN product_category VARCHAR(50) NOT NULL DEFAULT '봉제' COMMENT '카테고리',
ADD COLUMN product_main_image VARCHAR(500) NULL COMMENT '메인 이미지',
ADD COLUMN product_size VARCHAR(100) NULL COMMENT '상품 크기',
ADD COLUMN product_weight VARCHAR(50) NULL COMMENT '상품 무게',
ADD COLUMN product_packaging_size VARCHAR(100) NULL COMMENT '포장 크기',
ADD COLUMN product_set_count INT NOT NULL DEFAULT 1 COMMENT '세트 수량',
ADD COLUMN product_small_pack_count INT NOT NULL DEFAULT 1 COMMENT '소포장 개수',
ADD COLUMN product_box_count INT NOT NULL DEFAULT 1 COMMENT '박스당 개수';

-- 4. product_id 인덱스 제거 (선택적, 필요시 주석 해제)
-- DROP INDEX idx_product_id ON purchase_orders;

