-- 마이그레이션: 109_add_shop_order_statement_and_payment_proof
-- 설명: 주문 명세서 파일 경로 및 입금 내역 캡처 이미지
-- 날짜: 2026-06-14

ALTER TABLE kr_shop_orders
  ADD COLUMN statement_file_path VARCHAR(500) NULL COMMENT '명세서 파일 경로' AFTER product_arrived,
  ADD COLUMN payment_proof_image VARCHAR(500) NULL COMMENT '입금 내역 캡처 이미지 URL' AFTER statement_file_path;
