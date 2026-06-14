-- 마이그레이션: 116_add_settlement_shipment_box_and_paid_dates
-- 설명: 판매금 정산 송장 박스수, 물류/WK/인벤티오 지급일
-- 날짜: 2026-06-14

ALTER TABLE kr_shop_order_lines
  ADD COLUMN shipment_box_count INT NULL COMMENT '정산 송장 박스수' AFTER inventio_settlement_paid,
  ADD COLUMN logistics_fee_paid TINYINT(1) NOT NULL DEFAULT 0 COMMENT '물류 수수료 지급 완료' AFTER shipment_box_count,
  ADD COLUMN logistics_fee_paid_at DATETIME NULL COMMENT '물류 수수료 지급일' AFTER logistics_fee_paid,
  ADD COLUMN wk_settlement_paid_at DATETIME NULL COMMENT 'WK 정산금 지급일' AFTER logistics_fee_paid_at,
  ADD COLUMN inventio_settlement_paid_at DATETIME NULL COMMENT '인벤티오 정산금 지급일' AFTER wk_settlement_paid_at;
