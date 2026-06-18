-- Migration: 129_add_shipping_ready_to_shop_order_lines
-- 설명: 주문 건별 출고준비 플래그
-- 날짜: 2026-06-14

ALTER TABLE kr_shop_order_lines
  ADD COLUMN shipping_ready TINYINT(1) NOT NULL DEFAULT 0 COMMENT '출고준비 (1=준비완료)' AFTER vat_exempt;
