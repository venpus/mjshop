-- 마이그레이션: 121_add_statement_delivered_to_shop_order_lines
-- 설명: 명세서 전달완료 여부 컬럼 추가
-- 날짜: 2026-06-14

SET @db := DATABASE();

SET @has_statement_delivered := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'kr_shop_order_lines'
    AND COLUMN_NAME = 'statement_delivered'
);

SET @sql_statement_delivered := IF(
  @has_statement_delivered = 0,
  'ALTER TABLE kr_shop_order_lines ADD COLUMN statement_delivered TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''명세서 전달완료'' AFTER statement_issued_at',
  'SELECT 1'
);
PREPARE stmt FROM @sql_statement_delivered;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
