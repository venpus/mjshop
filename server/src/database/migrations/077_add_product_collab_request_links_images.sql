-- 마이그레이션: 077_add_product_collab_request_links_images
-- 설명: 요청사항 관련 링크·이미지 URL 배열 필드 추가
-- 날짜: 2025-03-08

ALTER TABLE product_collab_products
  ADD COLUMN request_links JSON NULL COMMENT '요청사항 관련 링크 URL 목록' AFTER request_note_lang,
  ADD COLUMN request_image_urls JSON NULL COMMENT '요청사항 관련 이미지 URL 목록' AFTER request_links;
