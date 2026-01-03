-- 마이그레이션: 051_add_admin_cost_paid_to_purchase_orders
-- 설명: purchase_orders 테이블에 A레벨 관리자 비용 지불 완료 필드 추가
-- 날짜: 2024-12-30

ALTER TABLE purchase_orders
ADD COLUMN admin_cost_paid BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'A레벨 관리자 비용 지불 완료 여부',
ADD COLUMN admin_cost_paid_date DATE NULL COMMENT 'A레벨 관리자 비용 지불 완료일';

CREATE INDEX idx_admin_cost_paid ON purchase_orders(admin_cost_paid);

