-- 마이그레이션: 021_add_count_to_package_info
-- 설명: package_info 테이블에 count(건수) 컬럼 추가
-- 날짜: 2024-12-24

ALTER TABLE package_info
ADD COLUMN count INT NULL COMMENT '건수 (몇 박스/마대)' AFTER method;

