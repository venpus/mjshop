-- 마이그레이션: 082_add_body_translation_provider
-- 설명: 메시지 번역에 사용된 AI(openai/qwen) 저장
-- 날짜: 2025-03-08

ALTER TABLE product_collab_messages
  ADD COLUMN body_translation_provider VARCHAR(16) NULL COMMENT '번역 제공: openai / qwen' AFTER body_lang;
