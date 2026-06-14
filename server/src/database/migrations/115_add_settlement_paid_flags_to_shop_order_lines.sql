-- 마이그레이션: 115_add_settlement_paid_flags_to_shop_order_lines
-- 설명: 판매금 정산 WK/인벤티오 지불 완료 여부
-- 날짜: 2026-06-14

ALTER TABLE kr_shop_order_lines
  ADD COLUMN wk_settlement_paid TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'WK 정산금 지불 완료' AFTER cny_exchange_rate,
  ADD COLUMN inventio_settlement_paid TINYINT(1) NOT NULL DEFAULT 0 COMMENT '인벤티오 정산금 지불 완료' AFTER wk_settlement_paid;
