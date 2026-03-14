-- 마이그레이션: 090_add_access_logs_device_model
-- 설명: access_logs에 기기 모델/설명 컬럼 추가
-- 날짜: 2025-03-14

ALTER TABLE access_logs
  ADD COLUMN device_model VARCHAR(200) NULL COMMENT '기기 모델/설명 (User-Agent 파싱)' AFTER device;
