-- 마이그레이션: 017_add_estimated_shipment_date
-- 설명: purchase_orders 테이블에 estimated_shipment_date 컬럼 추가
-- 날짜: 2024-12-24

ALTER TABLE purchase_orders
ADD COLUMN estimated_shipment_date DATE NULL COMMENT '예상 출고일' AFTER estimated_delivery;

