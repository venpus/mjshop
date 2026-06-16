-- 마이그레이션: 125_add_logistics_fee_paid_to_shop_shipment_batches
-- 설명: 배송 묶음별 물류 수수료 지급 완료·지급일
-- 날짜: 2026-06-16

ALTER TABLE kr_shop_shipment_batches
  ADD COLUMN logistics_fee_paid TINYINT(1) NOT NULL DEFAULT 0 COMMENT '물류 수수료 지급 완료' AFTER shipment_date,
  ADD COLUMN logistics_fee_paid_at DATETIME NULL COMMENT '물류 수수료 지급일' AFTER logistics_fee_paid;
