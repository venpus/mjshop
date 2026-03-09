-- 마이그레이션: 076_add_product_collab_request_note
-- 설명: 제품 등록 시 요청사항 필드 및 AI 번역 필드 추가
-- 날짜: 2025-03-08

ALTER TABLE product_collab_products
  ADD COLUMN request_note TEXT NULL COMMENT '등록 시 입력한 요청사항' AFTER sku_count,
  ADD COLUMN request_note_translated TEXT NULL COMMENT '한↔중 번역문' AFTER request_note,
  ADD COLUMN request_note_lang VARCHAR(8) NULL COMMENT '원문 언어: ko / zh' AFTER request_note_translated;
