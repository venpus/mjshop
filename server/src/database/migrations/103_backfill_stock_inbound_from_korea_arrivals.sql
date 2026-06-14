-- 마이그레이션: 103_backfill_stock_inbound_from_korea_arrivals
-- 설명: 기존 패킹리스트 한국도착 데이터를 입고 재고 테이블에 반영
-- 날짜: 2026-06-14

INSERT INTO kr_stock_inbound_items (
  purchase_order_id,
  group_key,
  product_id,
  product_name,
  po_number,
  product_main_image,
  unit_price,
  inbound_quantity,
  selling_price,
  stock_quantity
)
SELECT
  po.id AS purchase_order_id,
  CONCAT(po.id, '-', po.product_name) AS group_key,
  po.product_id,
  po.product_name,
  po.po_number,
  po.product_main_image,
  COALESCE(
    NULLIF(po.expected_final_unit_price, 0),
    NULLIF(po.order_unit_price, 0),
    NULLIF(po.unit_price, 0)
  ) AS unit_price,
  COALESCE(summary.arrived_quantity, 0) AS inbound_quantity,
  p.price AS selling_price,
  COALESCE(summary.arrived_quantity, 0) AS stock_quantity
FROM purchase_orders po
INNER JOIN v_purchase_order_shipping_summary summary ON po.id = summary.purchase_order_id
LEFT JOIN products p ON po.product_id = p.id
LEFT JOIN kr_stock_inbound_items existing ON po.id = existing.purchase_order_id
WHERE existing.id IS NULL
  AND po.order_status != '취소됨'
  AND COALESCE(summary.arrived_quantity, 0) > 0;
