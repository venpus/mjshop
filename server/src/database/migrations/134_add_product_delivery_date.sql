-- 마이그레이션: 134_add_product_delivery_date
-- 설명: 상품 납기일(날짜) 필드 추가 (idempotent)
-- 날짜: 2026-06-14

SET @db := DATABASE();

SET @has_delivery_date := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'products' AND COLUMN_NAME = 'delivery_date'
);
SET @sql := IF(
  @has_delivery_date = 0,
  'ALTER TABLE products ADD COLUMN delivery_date DATE NULL COMMENT ''납기일(날짜)'' AFTER delivery_days',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
