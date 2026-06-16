-- 마이그레이션: 124_widen_shop_order_line_tracking_number
-- 설명: 여러 송장번호(쉼표 구분) 저장을 위해 주문 라인 송장번호 컬럼 확장
-- 날짜: 2026-06-14

ALTER TABLE kr_shop_order_lines
  MODIFY COLUMN tracking_number VARCHAR(255) NULL COMMENT '송장번호';
