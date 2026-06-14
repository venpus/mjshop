-- 마이그레이션: 112_add_shop_order_line_amount_breakdown
-- 설명: 판매 주문 라인 금액 상세 (제품 공급가, VAT, 총계)
-- 날짜: 2026-06-14

ALTER TABLE kr_shop_order_lines
  ADD COLUMN product_supply_amount DECIMAL(12, 2) NULL COMMENT '제품 판매 금액 (VAT·택배비 제외)' AFTER delivery_fee,
  ADD COLUMN vat_amount DECIMAL(12, 2) NULL COMMENT '부가세 (KRW)' AFTER product_supply_amount;

ALTER TABLE kr_shop_order_lines
  MODIFY COLUMN total_amount DECIMAL(12, 2) NULL COMMENT '총계 VAT포함 (KRW)';

UPDATE kr_shop_order_lines
SET
  product_supply_amount = order_box_count * quantity_per_box * COALESCE(sale_unit_price, 0),
  vat_amount = ROUND(order_box_count * quantity_per_box * COALESCE(sale_unit_price, 0) * 0.1)
WHERE product_supply_amount IS NULL;
