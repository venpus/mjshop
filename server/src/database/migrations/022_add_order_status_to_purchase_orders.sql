-- 마이그레이션: 022_add_order_status_to_purchase_orders
-- 설명: purchase_orders 테이블에 order_status 컬럼 추가
-- 날짜: 2024-12-24

ALTER TABLE purchase_orders
ADD COLUMN order_status ENUM('발주확인', '발주 대기', '취소됨') NOT NULL DEFAULT '발주 대기' COMMENT '발주 상태' AFTER is_confirmed;

-- 인덱스 추가 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_order_status ON purchase_orders(order_status);

