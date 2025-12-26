-- 마이그레이션: 016_create_po_views
-- 설명: 발주 관리 계산 필드 VIEW 생성
-- 날짜: 2024-12-24

-- 발주 총액 계산 VIEW
CREATE OR REPLACE VIEW purchase_order_totals AS
SELECT 
  po.id,
  po.po_number,
  po.unit_price,
  po.quantity,
  
  -- 기본 비용 계산
  po.unit_price * po.quantity AS subtotal,
  po.unit_price * po.quantity * (1 + po.commission_rate / 100) AS basic_cost_total,
  po.unit_price * po.quantity * (po.commission_rate / 100) AS commission_amount,
  
  -- 옵션/인건비 합계
  COALESCE(SUM(CASE WHEN ci.item_type = 'option' THEN ci.cost ELSE 0 END), 0) AS total_option_cost,
  COALESCE(SUM(CASE WHEN ci.item_type = 'labor' THEN ci.cost ELSE 0 END), 0) AS total_labor_cost,
  
  -- 운송비 합계
  po.shipping_cost + po.warehouse_shipping_cost AS shipping_cost_total,
  
  -- 최종 결제 금액
  (po.unit_price * po.quantity * (1 + po.commission_rate / 100)) +
  (po.shipping_cost + po.warehouse_shipping_cost) +
  COALESCE(SUM(CASE WHEN ci.item_type = 'option' THEN ci.cost ELSE 0 END), 0) +
  COALESCE(SUM(CASE WHEN ci.item_type = 'labor' THEN ci.cost ELSE 0 END), 0) AS final_payment_amount,
  
  -- 최종 예상 단가
  CASE 
    WHEN po.quantity > 0 THEN
      ((po.unit_price * po.quantity * (1 + po.commission_rate / 100)) +
       (po.shipping_cost + po.warehouse_shipping_cost) +
       COALESCE(SUM(CASE WHEN ci.item_type = 'option' THEN ci.cost ELSE 0 END), 0) +
       COALESCE(SUM(CASE WHEN ci.item_type = 'labor' THEN ci.cost ELSE 0 END), 0)) / po.quantity
    ELSE 0
  END AS expected_final_unit_price,
  
  -- 선금/잔금 계산
  CASE 
    WHEN po.quantity > 0 THEN
      (po.unit_price * po.quantity * (po.advance_payment_rate / 100))
    ELSE 0
  END AS calculated_advance_payment_amount,
  
  CASE 
    WHEN po.quantity > 0 THEN
      ((po.unit_price * po.quantity * (1 + po.commission_rate / 100)) +
       (po.shipping_cost + po.warehouse_shipping_cost) +
       COALESCE(SUM(CASE WHEN ci.item_type = 'option' THEN ci.cost ELSE 0 END), 0) +
       COALESCE(SUM(CASE WHEN ci.item_type = 'labor' THEN ci.cost ELSE 0 END), 0)) -
      (po.unit_price * po.quantity * (po.advance_payment_rate / 100))
    ELSE 0
  END AS calculated_balance_payment_amount
  
FROM purchase_orders po
LEFT JOIN po_cost_items ci ON po.id = ci.purchase_order_id
GROUP BY po.id, po.po_number, po.unit_price, po.quantity, po.commission_rate, 
         po.shipping_cost, po.warehouse_shipping_cost, po.advance_payment_rate;

-- 작업 상태 계산 VIEW
CREATE OR REPLACE VIEW purchase_order_work_status AS
SELECT 
  po.id,
  po.po_number,
  po.work_start_date,
  po.work_end_date,
  CASE 
    WHEN po.work_end_date IS NOT NULL THEN '완료'
    WHEN po.work_start_date IS NOT NULL THEN '작업중'
    ELSE '작업대기'
  END AS work_status,
  COUNT(wi.id) AS total_work_items,
  SUM(CASE WHEN wi.is_completed = TRUE THEN 1 ELSE 0 END) AS completed_work_items
FROM purchase_orders po
LEFT JOIN work_items wi ON po.id = wi.purchase_order_id
GROUP BY po.id, po.po_number, po.work_start_date, po.work_end_date;

-- 공장 출고 상태 계산 VIEW
CREATE OR REPLACE VIEW purchase_order_factory_status AS
SELECT 
  po.id,
  po.po_number,
  po.quantity AS ordered_quantity,
  COALESCE(SUM(fs.quantity), 0) AS total_shipped_quantity,
  COALESCE(SUM(re.quantity), 0) AS total_return_quantity,
  COALESCE(SUM(fs.quantity), 0) - COALESCE(SUM(re.quantity), 0) AS total_received_quantity,
  CASE 
    WHEN (COALESCE(SUM(fs.quantity), 0) - COALESCE(SUM(re.quantity), 0)) >= po.quantity THEN '수령완료'
    WHEN COUNT(fs.id) > 0 THEN '배송중'
    ELSE '출고대기'
  END AS factory_status
FROM purchase_orders po
LEFT JOIN factory_shipments fs ON po.id = fs.purchase_order_id
LEFT JOIN return_exchanges re ON po.id = re.purchase_order_id
GROUP BY po.id, po.po_number, po.quantity;

