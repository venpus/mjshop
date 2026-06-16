-- 마이그레이션: 120_add_statement_group_and_issued_at
-- 설명: 명세서 발행 묶음 ID 및 거래일자 컬럼 추가
-- 날짜: 2026-06-14

SET @db := DATABASE();

SET @has_group_id := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'kr_shop_order_lines'
    AND COLUMN_NAME = 'statement_group_id'
);

SET @sql_group_id := IF(
  @has_group_id = 0,
  'ALTER TABLE kr_shop_order_lines ADD COLUMN statement_group_id VARCHAR(36) NULL COMMENT ''명세서 발행 묶음 ID'' AFTER statement_file_path',
  'SELECT 1'
);
PREPARE stmt FROM @sql_group_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_issued_at := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'kr_shop_order_lines'
    AND COLUMN_NAME = 'statement_issued_at'
);

SET @sql_issued_at := IF(
  @has_issued_at = 0,
  'ALTER TABLE kr_shop_order_lines ADD COLUMN statement_issued_at DATE NULL COMMENT ''명세서 거래일자'' AFTER statement_group_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql_issued_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_group_index := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'kr_shop_order_lines'
    AND INDEX_NAME = 'idx_statement_group_id'
);

SET @sql_group_index := IF(
  @has_group_index = 0,
  'ALTER TABLE kr_shop_order_lines ADD INDEX idx_statement_group_id (statement_group_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql_group_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
