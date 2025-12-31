-- 마이그레이션: 048_update_shipping_cost_view_simple_average
-- 설명: 패킹리스트 배송비 계산 방식을 단순 평균 방식으로 변경
-- 날짜: 2024-12-24
-- 변경 내용: unit_shipping_cost 계산을 출고 수량 기준 평균으로 단순화 (출고 수량 > 발주 수량인 경우의 특별 처리 제거)

-- 기존 VIEW 삭제
DROP VIEW IF EXISTS v_purchase_order_packing_shipping_cost;

-- 발주별 패킹리스트 배송비 집계 VIEW 재생성 (단순 평균 방식)
-- 배송비 계산 방식: 출고 수량 기준으로 비율 배분한 후, 출고 수량으로 나눈 평균 단가 계산
-- 미출고 수량에 대해서도 동일한 평균 단가를 적용하여 예상 배송비 계산
CREATE VIEW v_purchase_order_packing_shipping_cost AS
SELECT 
  shipping_data.purchase_order_id,
  po.quantity AS ordered_quantity,
  shipping_data.total_shipping_cost,
  shipping_data.total_shipped_quantity,
  -- 발주 단위당 배송비 (출고 수량 기준 평균)
  -- 실제 출고 수량에 대한 평균 배송비를 계산하여 미출고 수량에도 동일하게 적용
  CASE 
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

