-- 마이그레이션: 055_add_show_admin_only_data_to_permissions
-- 설명: 권한 설정 테이블에 A레벨 전용 데이터 표시 여부 필드 추가
-- 날짜: 2024-12-24

ALTER TABLE permission_settings
ADD COLUMN show_admin_only_data BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'A레벨 전용 데이터 표시 여부 (발주관리, 패킹리스트, 결제내역에만 사용)';

