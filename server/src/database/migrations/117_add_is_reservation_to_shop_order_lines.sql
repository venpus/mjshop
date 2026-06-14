-- 마이그레이션: 117_add_is_reservation_to_shop_order_lines
-- 설명: 주문 라인 예약 여부 구분
-- 날짜: 2026-06-14

SET @dbname = DATABASE();
SET @tablename = 'kr_shop_order_lines';
SET @columnname = 'is_reservation';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT(
    'ALTER TABLE ',
    @tablename,
    ' ADD COLUMN ',
    @columnname,
    ' TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''예약 여부'' AFTER sort_order'
  )
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

CREATE INDEX IF NOT EXISTS idx_shop_order_lines_reservation ON kr_shop_order_lines (shop_order_id, is_reservation);
