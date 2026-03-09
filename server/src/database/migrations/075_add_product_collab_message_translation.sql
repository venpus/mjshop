-- 마이그레이션: 075_add_product_collab_message_translation
-- 설명: 스레드 메시지 한↔중 번역 저장 컬럼 추가
-- 날짜: 2025-03-08

ALTER TABLE product_collab_messages
  ADD COLUMN body_translated TEXT NULL COMMENT '한↔중 번역문 (원문이 한국어면 중국어, 원문이 중국어면 한국어)' AFTER body,
  ADD COLUMN body_lang VARCHAR(8) NULL COMMENT '원문 언어: ko / zh' AFTER body_translated;
