-- 마이그레이션: 100_add_packing_list_codes_to_sweet_tracker_invoice_cache
-- 설명: 운송장 캐시 행에 연결 패킹리스트 코드 목록(JSON 문자열 배열) 저장
-- 날짜: 2026-04-15

ALTER TABLE sweet_tracker_invoice_cache
  ADD COLUMN packing_list_codes_json TEXT NULL COMMENT '연결 패킹리스트 코드 JSON 배열 ["코드1","코드2"]' AFTER last_time_string;
