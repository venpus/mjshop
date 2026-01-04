-- 마이그레이션: 052_add_admin_cost_paid_to_packing_lists
-- 설명: packing_lists 테이블에 A레벨 관리자 비용 지불 완료 필드 추가
-- 날짜: 2025-01-04

ALTER TABLE packing_lists
ADD COLUMN admin_cost_paid BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'A레벨 관리자 비용 지불 완료 여부',
ADD COLUMN admin_cost_paid_date DATE NULL COMMENT 'A레벨 관리자 비용 지불 완료일';

CREATE INDEX idx_admin_cost_paid ON packing_lists(admin_cost_paid);

