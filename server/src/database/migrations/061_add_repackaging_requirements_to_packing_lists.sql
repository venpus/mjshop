-- 마이그레이션: 061_add_repackaging_requirements_to_packing_lists
-- 설명: 패킹리스트에 재포장 요구사항 필드 추가
-- 날짜: 2024-12-24

ALTER TABLE packing_lists
ADD COLUMN repackaging_requirements TEXT NULL COMMENT '재포장 요구사항' AFTER wk_payment_date;

