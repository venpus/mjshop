-- 마이그레이션: 036_force_recreate_shipping_cost_view
-- 설명: v_purchase_order_packing_shipping_cost VIEW 강제 재생성
-- 날짜: 2024-12-24
-- 변경 내용: VIEW 삭제 후 재생성하여 ordered_quantity 컬럼이 포함되도록 보장

-- 기존 VIEW 삭제
DROP VIEW IF EXISTS v_purchase_order_packing_shipping_cost;

-- 발주별 패킹리스트 배송비 집계 VIEW 재생성
-- 배송비 계산 방식: 출고 수량 기준으로 비율 배분하되, 
-- 발송 수량이 발주 수량을 초과하면 발주 수량 기준으로 계산
CREATE VIEW v_purchase_order_packing_shipping_cost AS
SELECT 
  shipping_data.purchase_order_id,
  po.quantity AS ordered_quantity,
  shipping_data.total_shipping_cost,
  shipping_data.total_shipped_quantity,
  -- 발주 단위당 배송비 (출고 수량이 발주 수량을 초과하면 발주 수량 기준)
  CASE 
    WHEN shipping_data.total_shipped_quantity > po.quantity AND po.quantity > 0 THEN
      shipping_data.total_shipping_cost / po.quantity
    WHEN shipping_data.total_shipped_quantity > 0 THEN
      shipping_data.total_shipping_cost / shipping_data.total_shipped_quantity
    ELSE 0
  END AS unit_shipping_cost
FROM (
  SELECT 
    pli.purchase_order_id,
    -- 발주별 총 배송비 (출고 수량 기준 비율 배분)
    SUM(
      pl.shipping_cost * (pli.total_quantity / group_total.total_quantity)
    ) AS total_shipping_cost,
    -- 발주별 총 출고 수량
    SUM(pli.total_quantity) AS total_shipped_quantity
  FROM packing_list_items pli
  INNER JOIN packing_lists pl ON pli.packing_list_id = pl.id
  INNER JOIN (
    -- 각 패킹리스트의 총 출고 수량
    SELECT 
      packing_list_id,
      SUM(total_quantity) AS total_quantity
    FROM packing_list_items
    GROUP BY packing_list_id
  ) group_total ON pl.id = group_total.packing_list_id
  WHERE pli.purchase_order_id IS NOT NULL
    AND pl.shipping_cost IS NOT NULL
    AND pl.shipping_cost > 0
  GROUP BY pli.purchase_order_id
) shipping_data
INNER JOIN purchase_orders po ON shipping_data.purchase_order_id = po.id;

