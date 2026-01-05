-- 마이그레이션: 059_update_null_product_id_with_unique_ids
-- 설명: purchase_orders 테이블의 모든 레코드에 대해 새로운 유니크한 product_id 생성 및 업데이트
-- 날짜: 2024-12-24
-- 주의: 기존 product_id 값도 모두 새로운 UUID로 교체됩니다.

-- 모든 레코드의 product_id를 새로운 UUID로 업데이트
UPDATE purchase_orders
SET product_id = UUID();

