-- 마이그레이션: 046_add_is_admin_only_to_cost_items
-- 설명: po_cost_items 테이블에 is_admin_only 컬럼 추가 (A 레벨 관리자만 입력 가능한 항목 구분)
-- 날짜: 2025-01-02

-- is_admin_only 컬럼 추가 (기본값: false)
ALTER TABLE po_cost_items
ADD COLUMN is_admin_only BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'A 레벨 관리자 전용 항목 여부' AFTER quantity;

-- 인덱스 추가 (필요 시)
-- ALTER TABLE po_cost_items ADD INDEX idx_is_admin_only (is_admin_only);

