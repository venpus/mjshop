-- 마이그레이션: 132_add_product_cost_logistics_fields
-- 설명: 상품 원가·물류·부가비용·MOQ·납기 등 필드 추가 (컬럼별 idempotent)
-- 날짜: 2026-06-14

SET @db := DATABASE();

SET @has_logistics_cost := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'products' AND COLUMN_NAME = 'logistics_cost'
);
SET @sql := IF(
  @has_logistics_cost = 0,
  'ALTER TABLE products ADD COLUMN logistics_cost DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT ''물류비(CNY)'' AFTER price',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_final_unit_cost := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'products' AND COLUMN_NAME = 'final_unit_cost'
);
SET @sql := IF(
  @has_final_unit_cost = 0,
  'ALTER TABLE products ADD COLUMN final_unit_cost DECIMAL(10, 2) NULL COMMENT ''최종 원가(CNY)'' AFTER logistics_cost',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_has_tag := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'products' AND COLUMN_NAME = 'has_tag'
);
SET @sql := IF(
  @has_has_tag = 0,
  'ALTER TABLE products ADD COLUMN has_tag TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''택 유무'' AFTER final_unit_cost',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_reorder_moq := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'products' AND COLUMN_NAME = 'reorder_moq'
);
SET @sql := IF(
  @has_reorder_moq = 0,
  'ALTER TABLE products ADD COLUMN reorder_moq INT NULL COMMENT ''2차 주문 MOQ 수량'' AFTER box_count',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_delivery_days := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'products' AND COLUMN_NAME = 'delivery_days'
);
SET @sql := IF(
  @has_delivery_days = 0,
  'ALTER TABLE products ADD COLUMN delivery_days INT NULL COMMENT ''납기(일)'' AFTER reorder_moq',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_tag_addon_enabled := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'products' AND COLUMN_NAME = 'tag_addon_enabled'
);
SET @sql := IF(
  @has_tag_addon_enabled = 0,
  'ALTER TABLE products ADD COLUMN tag_addon_enabled TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''택 추가 여부'' AFTER delivery_days',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_tag_addon_price := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'products' AND COLUMN_NAME = 'tag_addon_price'
);
SET @sql := IF(
  @has_tag_addon_price = 0,
  'ALTER TABLE products ADD COLUMN tag_addon_price DECIMAL(10, 2) NULL COMMENT ''택 추가 비용(CNY)'' AFTER tag_addon_enabled',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_packaging_addon_enabled := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'products' AND COLUMN_NAME = 'packaging_addon_enabled'
);
SET @sql := IF(
  @has_packaging_addon_enabled = 0,
  'ALTER TABLE products ADD COLUMN packaging_addon_enabled TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''포장 추가 여부'' AFTER tag_addon_price',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_packaging_addon_price := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'products' AND COLUMN_NAME = 'packaging_addon_price'
);
SET @sql := IF(
  @has_packaging_addon_price = 0,
  'ALTER TABLE products ADD COLUMN packaging_addon_price DECIMAL(10, 2) NULL COMMENT ''포장 추가 비용(CNY)'' AFTER packaging_addon_enabled',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_labor_cost := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'products' AND COLUMN_NAME = 'labor_cost'
);
SET @sql := IF(
  @has_labor_cost = 0,
  'ALTER TABLE products ADD COLUMN labor_cost DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT ''인건비(CNY)'' AFTER packaging_addon_price',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
