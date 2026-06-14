-- 마이그레이션: 105_add_shop_order_progress_fields
-- 설명: 주문 진행 관리 필드 추가
-- 날짜: 2026-06-14

ALTER TABLE kr_shop_orders
  ADD COLUMN company_name VARCHAR(255) NULL COMMENT '상호명' AFTER note,
  ADD COLUMN order_box_count INT NOT NULL DEFAULT 0 COMMENT '주문 박스 수' AFTER company_name,
  ADD COLUMN quantity_per_box INT NOT NULL DEFAULT 0 COMMENT '한박스 수량' AFTER order_box_count,
  ADD COLUMN sale_unit_price DECIMAL(12, 2) NULL COMMENT '판매 단가 (KRW)' AFTER quantity_per_box,
  ADD COLUMN delivery_fee DECIMAL(12, 2) NULL COMMENT '택배비 (KRW)' AFTER sale_unit_price,
  ADD COLUMN total_amount DECIMAL(12, 2) NULL COMMENT '총계 (KRW)' AFTER delivery_fee,
  ADD COLUMN address VARCHAR(500) NULL COMMENT '배송 주소' AFTER total_amount,
  ADD COLUMN recipient_name VARCHAR(100) NULL COMMENT '수령인' AFTER address,
  ADD COLUMN phone_number VARCHAR(50) NULL COMMENT '전화번호' AFTER recipient_name;
