-- 마이그레이션: 056_remove_show_admin_only_data_from_permissions
-- 설명: 권한 설정 테이블에서 A레벨 전용 데이터 표시 여부 필드 제거
-- 날짜: 2024-12-24

ALTER TABLE permission_settings
DROP COLUMN IF EXISTS show_admin_only_data;

