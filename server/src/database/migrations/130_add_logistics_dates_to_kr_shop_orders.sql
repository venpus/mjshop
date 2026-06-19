-- 마이그레이션: 130_add_logistics_dates_to_kr_shop_orders
-- 설명: 주문 상품 물류 일정(중국입고·출고, 한국도착, 실제도착)
-- 날짜: 2026-06-16

ALTER TABLE kr_shop_orders
  ADD COLUMN china_inbound_date DATE NULL COMMENT '중국입고 날짜' AFTER order_date,
  ADD COLUMN china_outbound_date DATE NULL COMMENT '중국 출고 날짜' AFTER china_inbound_date,
  ADD COLUMN korea_arrival_date DATE NULL COMMENT '한국도착 날짜' AFTER china_outbound_date,
  ADD COLUMN actual_arrival_date DATE NULL COMMENT '실제 도착 날짜' AFTER korea_arrival_date;
