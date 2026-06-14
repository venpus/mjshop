-- 마이그레이션: 111_add_quantity_per_box_to_shop_order_lines
-- 설명: 주문 라인별 한박스 입수량 (상단 기본값 + 라인별 수동 수정)
-- 날짜: 2026-06-14

ALTER TABLE kr_shop_order_lines
  ADD COLUMN quantity_per_box INT NOT NULL DEFAULT 0 COMMENT '한박스 입수량' AFTER order_box_count;

UPDATE kr_shop_order_lines l
INNER JOIN kr_shop_orders o ON o.id = l.shop_order_id
SET l.quantity_per_box = o.quantity_per_box;
