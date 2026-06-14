-- 마이그레이션: 114_add_cny_exchange_rate_to_shop_order_lines
-- 설명: 판매금 정산용 주문 건별 위안 환율
-- 날짜: 2026-06-14

ALTER TABLE kr_shop_order_lines
  ADD COLUMN cny_exchange_rate DECIMAL(10, 4) NULL COMMENT '판매금 정산 위안 환율(₩/¥)'
  AFTER tax_invoice_issued;
