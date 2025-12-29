-- 마이그레이션: 017_add_estimated_shipment_date
-- 설명: purchase_orders 테이블에 estimated_shipment_date 컬럼 추가
-- 날짜: 2024-12-24

-- 컬럼이 이미 존재하는지 확인 후 추가 (MariaDB/MySQL은 IF NOT EXISTS 지원 안 함)
SET @dbname = DATABASE();
SET @tablename = 'purchase_orders';
SET @columnname = 'estimated_shipment_date';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' DATE NULL COMMENT ''예상 출고일'' AFTER estimated_delivery')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

