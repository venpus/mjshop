-- 마이그레이션: 113_add_tax_invoice_issued_to_shop_order_lines
-- 설명: 판매 주문 라인 세금계산서 발행 여부
-- 날짜: 2026-06-14

ALTER TABLE kr_shop_order_lines
  ADD COLUMN tax_invoice_issued TINYINT(1) NOT NULL DEFAULT 0 COMMENT '세금계산서 발행 여부'
  AFTER product_arrived;
