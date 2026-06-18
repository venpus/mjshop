-- Migration: 128_add_vat_exempt_to_shop_order_lines
-- 설명: 주문 건별 부가세 없음 거래 플래그
-- 날짜: 2026-06-14

ALTER TABLE kr_shop_order_lines
  ADD COLUMN vat_exempt TINYINT(1) NOT NULL DEFAULT 0 COMMENT '부가세 없음 거래 (1=부가세 미포함)' AFTER tax_invoice_issued;
