-- 마이그레이션: 084_add_manufacturing_translation_status
-- 설명: 제조 문서 번역 상태 (비동기 번역용)
-- 날짜: 2025-03-14

ALTER TABLE manufacturing_documents
  ADD COLUMN translation_status VARCHAR(20) NOT NULL DEFAULT 'idle'
  COMMENT 'idle|pending|translating|completed|failed' AFTER barcode;
