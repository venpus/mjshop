-- 마이그레이션: 018_add_inland_company_to_logistics_info
-- 설명: logistics_info 테이블에 inland_company 컬럼 추가
-- 날짜: 2024-12-24

ALTER TABLE logistics_info
ADD COLUMN inland_company VARCHAR(255) NULL COMMENT '내륙운송회사' AFTER tracking_number;

