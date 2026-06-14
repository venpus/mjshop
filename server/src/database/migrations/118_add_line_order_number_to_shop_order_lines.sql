-- Migration: 118_add_line_order_number_to_shop_order_lines
-- 주문건 고유번호 (영문 대문자 + 숫자 6자리)

ALTER TABLE kr_shop_order_lines
  ADD COLUMN line_order_number VARCHAR(6) NULL COMMENT '주문건 고유번호(영문대문자/숫자 6자리)' AFTER id;

CREATE UNIQUE INDEX uk_shop_order_line_order_number
  ON kr_shop_order_lines (line_order_number);
