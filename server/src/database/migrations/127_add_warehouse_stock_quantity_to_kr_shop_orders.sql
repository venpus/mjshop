-- 마이그레이션: 127_add_warehouse_stock_quantity_to_kr_shop_orders
-- 설명: 입고 미연결 주문의 전체 재고 수량 저장
-- 날짜: 2026-06-16

ALTER TABLE kr_shop_orders
  ADD COLUMN warehouse_stock_quantity INT NULL COMMENT '전체 재고(입고 미연결 시)' AFTER stock_quantity;
