-- 마이그레이션: 053_update_order_unit_price_and_expected_final_unit_price
-- 설명: 발주관리 DB의 order_unit_price와 expected_final_unit_price를 자동 계산하여 업데이트
-- 날짜: 2025-01-04

-- 1. order_unit_price 업데이트 (unit_price + back_margin)
-- NULL이거나 0인 경우에만 업데이트
UPDATE purchase_orders po
SET order_unit_price = COALESCE(po.unit_price, 0) + COALESCE(po.back_margin, 0)
WHERE (po.order_unit_price IS NULL OR po.order_unit_price = 0)
  AND po.unit_price IS NOT NULL;

-- 2. expected_final_unit_price 업데이트
-- 계산식: (최종 결제 금액 + 패킹리스트 배송비) / 수량
-- 최종 결제 금액 = 기본 비용 총액 + 배송비 총액 + 옵션 비용 + 인건비
-- 기본 비용 총액 = 발주단가 × 수량 × (1 + 수수료율 / 100)
-- 배송비 총액 = shipping_cost + warehouse_shipping_cost
UPDATE purchase_orders po
LEFT JOIN (
  -- 옵션 비용 합계
  SELECT 
    purchase_order_id,
    SUM(CASE WHEN item_type = 'option' THEN cost ELSE 0 END) as total_option_cost
  FROM po_cost_items
  GROUP BY purchase_order_id
) option_costs ON po.id = option_costs.purchase_order_id
LEFT JOIN (
  -- 인건비 합계
  SELECT 
    purchase_order_id,
    SUM(CASE WHEN item_type = 'labor' THEN cost ELSE 0 END) as total_labor_cost
  FROM po_cost_items
  GROUP BY purchase_order_id
) labor_costs ON po.id = labor_costs.purchase_order_id
LEFT JOIN (
  -- 패킹리스트 배송비 (v_purchase_order_packing_shipping_cost 뷰 사용)
  SELECT 
    purchase_order_id,
    unit_shipping_cost * ordered_quantity as packing_list_shipping_cost
  FROM v_purchase_order_packing_shipping_cost
) packing_shipping ON po.id = packing_shipping.purchase_order_id
SET po.expected_final_unit_price = CASE
  WHEN po.quantity > 0 THEN
    (
      -- 기본 비용 총액 (발주단가 × 수량 × (1 + 수수료율 / 100))
      (COALESCE(po.order_unit_price, COALESCE(po.unit_price, 0) + COALESCE(po.back_margin, 0)) * po.quantity * (1 + COALESCE(po.commission_rate, 0) / 100))
      +
      -- 배송비 총액
      (COALESCE(po.shipping_cost, 0) + COALESCE(po.warehouse_shipping_cost, 0))
      +
      -- 옵션 비용
      COALESCE(option_costs.total_option_cost, 0)
      +
      -- 인건비
      COALESCE(labor_costs.total_labor_cost, 0)
      +
      -- 패킹리스트 배송비
      COALESCE(packing_shipping.packing_list_shipping_cost, 0)
    ) / po.quantity
  ELSE NULL
END
WHERE (po.expected_final_unit_price IS NULL OR po.expected_final_unit_price = 0)
  AND po.quantity > 0
  AND po.unit_price IS NOT NULL;

