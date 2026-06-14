-- 마이그레이션: 108_add_shop_order_fulfillment_fields
-- 설명: 주문 송장번호 및 진행 상태 체크 필드 추가
-- 날짜: 2026-06-14

ALTER TABLE kr_shop_orders
  ADD COLUMN tracking_number VARCHAR(100) NULL COMMENT '송장번호' AFTER phone_number,
  ADD COLUMN statement_issued TINYINT(1) NOT NULL DEFAULT 0 COMMENT '명세서 발행 여부' AFTER tracking_number,
  ADD COLUMN payment_received TINYINT(1) NOT NULL DEFAULT 0 COMMENT '입금 여부' AFTER statement_issued,
  ADD COLUMN product_arrived TINYINT(1) NOT NULL DEFAULT 0 COMMENT '제품 도착 여부' AFTER payment_received;
