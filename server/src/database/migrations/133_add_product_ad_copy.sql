-- 마이그레이션: 133_add_product_ad_copy
-- 설명: 상품 광고문구 필드 추가 (idempotent)
-- 날짜: 2026-06-14

SET @db := DATABASE();

SET @has_ad_copy := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'products' AND COLUMN_NAME = 'ad_copy'
);
SET @sql := IF(
  @has_ad_copy = 0,
  'ALTER TABLE products ADD COLUMN ad_copy TEXT NULL COMMENT ''광고 문구'' AFTER labor_cost',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
