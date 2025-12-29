-- 마이그레이션: 037_add_unreceived_quantity_to_shipping_summary
-- 설명: v_purchase_order_shipping_summary VIEW에 미입고 수량 추가
-- 날짜: 2024-12-24
-- 변경 내용: 미입고 수량 = 발주 수량 - 업체 출고 수량

-- 기존 VIEW 삭제
DROP VIEW IF EXISTS v_purchase_order_shipping_summary;

-- 발주별 배송 수량 집계 VIEW (출고, 한국도착 등)
-- 미출고 수량 = 업체 출고 수량 - 패킹리스트 출고 수량
-- 미입고 수량 = 발주 수량 - 업체 출고 수량
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
  GREATEST(0, COALESCE(packing_list_shipped.total_shipped_quantity, 0) - COALESCE(arrived.total_arrived_quantity, 0)) AS shipping_quantity,
  
  -- 미입고 수량 (발주 수량 - 업체 출고 수량)
  GREATEST(0, po.quantity - COALESCE(factory_shipments.total_factory_shipped_quantity, 0)) AS unreceived_quantity
  
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

