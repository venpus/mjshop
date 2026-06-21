-- 마이그레이션: 131_add_initial_expected_unit_price_to_kr_shop_orders
-- 설명: 주문관리 최초 입력 예상단가 컬럼 추가 및 기존 데이터 백필
-- 날짜: 2026-06-14

ALTER TABLE kr_shop_orders
  ADD COLUMN initial_expected_unit_price DECIMAL(12, 2) NULL COMMENT '최초 입력 예상단가 (CNY)' AFTER unit_price;

-- 기존 주문: 현재 원가 단가를 최초 입력 예상단가로 백필
UPDATE kr_shop_orders
SET initial_expected_unit_price = unit_price
WHERE initial_expected_unit_price IS NULL
  AND unit_price IS NOT NULL;

-- 연결 발주의 최종 예상단가가 있으면 현재 원가 단가 동기화
UPDATE kr_shop_orders o
INNER JOIN purchase_orders po ON o.purchase_order_id = po.id
SET o.unit_price = po.expected_final_unit_price
WHERE po.expected_final_unit_price IS NOT NULL
  AND po.expected_final_unit_price > 0;
