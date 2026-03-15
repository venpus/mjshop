-- 마이그레이션: 092_add_access_logs_event_type
-- 설명: 접속 로그에 event_type 추가 (login: 로그인 시점, access: API 접속)
-- 날짜: 2025-03-15

ALTER TABLE access_logs
  ADD COLUMN event_type VARCHAR(20) NOT NULL DEFAULT 'access'
  COMMENT '이벤트 구분 (login: 로그인, access: API 접속)' AFTER device_model;
