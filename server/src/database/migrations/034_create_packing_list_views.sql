-- 마이그레이션: 034_create_packing_list_views
-- 설명: 패킹리스트 관련 VIEW 생성 (발주별 배송비 및 수량 집계)
-- 날짜: 2024-12-24

-- 발주별 패킹리스트 배송비 집계 VIEW
-- 배송비 계산 방식: 출고 수량 기준으로 비율 배분하되, 
-- 발송 수량이 발주 수량을 초과하면 발주 수량 기준으로 계산
CREATE OR REPLACE VIEW v_purchase_order_packing_shipping_cost AS
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

-- 발주별 배송 수량 집계 VIEW (출고, 한국도착 등)
CREATE OR REPLACE VIEW v_purchase_order_shipping_summary AS
SELECT 
  po.id AS purchase_order_id,
  po.quantity AS ordered_quantity,
  
  -- 업체 출고 수량 (factory_shipments에서 집계)
  COALESCE(factory_shipments.total_factory_shipped_quantity, 0) AS factory_shipped_quantity,
  
  -- 패킹리스트 출고 수량 (패킹리스트에서 집계)
  COALESCE(packing_list_shipped.total_shipped_quantity, 0) AS shipped_quantity,
  
  -- 한국도착 수량 (한국도착일에서 집계)
  COALESCE(arrived.total_arrived_quantity, 0) AS arrived_quantity,
  
  -- 미출고 수량 (업체 출고 수량 - 패킹리스트 출고 수량)
  GREATEST(0, COALESCE(factory_shipments.total_factory_shipped_quantity, 0) - COALESCE(packing_list_shipped.total_shipped_quantity, 0)) AS unshipped_quantity,
  
  -- 배송중 수량 (패킹리스트 출고되었지만 아직 도착하지 않은 수량)
  GREATEST(0, COALESCE(packing_list_shipped.total_shipped_quantity, 0) - COALESCE(arrived.total_arrived_quantity, 0)) AS shipping_quantity
  
FROM purchase_orders po
LEFT JOIN (
  SELECT 
    purchase_order_id,
    SUM(quantity) AS total_factory_shipped_quantity
  FROM factory_shipments
  GROUP BY purchase_order_id
) factory_shipments ON po.id = factory_shipments.purchase_order_id
LEFT JOIN (
  SELECT 
    purchase_order_id,
    SUM(total_quantity) AS total_shipped_quantity
  FROM packing_list_items
  WHERE purchase_order_id IS NOT NULL
  GROUP BY purchase_order_id
) packing_list_shipped ON po.id = packing_list_shipped.purchase_order_id
LEFT JOIN (
  SELECT 
    pli.purchase_order_id,
    SUM(korea.quantity) AS total_arrived_quantity
  FROM packing_list_korea_arrivals korea
  INNER JOIN packing_list_items pli ON korea.packing_list_item_id = pli.id
  WHERE pli.purchase_order_id IS NOT NULL
  GROUP BY pli.purchase_order_id
) arrived ON po.id = arrived.purchase_order_id;

