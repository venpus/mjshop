-- 마이그레이션: 024_remove_supplier_from_purchase_orders
-- 설명: purchase_orders 테이블에서 supplier_id 컬럼 제거
-- 날짜: 2024-12-24

-- 1. 외래키 제약조건 제거
SET @fk_name = (
  SELECT CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'purchase_orders'
    AND COLUMN_NAME = 'supplier_id'
    AND REFERENCED_TABLE_NAME IS NOT NULL
  LIMIT 1
);

SET @sql = CONCAT('ALTER TABLE purchase_orders DROP FOREIGN KEY ', @fk_name);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 인덱스 제거
DROP INDEX IF EXISTS idx_supplier_id ON purchase_orders;

-- 3. supplier_id 컬럼 제거
ALTER TABLE purchase_orders DROP COLUMN supplier_id;

