-- 마이그레이션: 110_create_kr_shop_order_lines
-- 설명: 제품(주문)당 여러 판매 주문 라인 지원
-- 날짜: 2026-06-14

CREATE TABLE IF NOT EXISTS kr_shop_order_lines (
  id VARCHAR(50) NOT NULL PRIMARY KEY COMMENT '주문 라인 ID',
  shop_order_id VARCHAR(50) NOT NULL COMMENT '주문(제품) ID (FK)',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '정렬 순서',
  company_name VARCHAR(255) NULL COMMENT '상호명',
  order_box_count INT NOT NULL DEFAULT 0 COMMENT '주문 박스 수',
  sale_unit_price DECIMAL(12, 2) NULL COMMENT '판매 단가 (KRW)',
  delivery_fee DECIMAL(12, 2) NULL COMMENT '택배비 (KRW)',
  total_amount DECIMAL(12, 2) NULL COMMENT '총계 (KRW)',
  address VARCHAR(500) NULL COMMENT '배송 주소',
  recipient_name VARCHAR(100) NULL COMMENT '수령인',
  phone_number VARCHAR(50) NULL COMMENT '전화번호',
  tracking_number VARCHAR(20) NULL COMMENT '송장번호',
  statement_issued TINYINT(1) NOT NULL DEFAULT 0 COMMENT '명세서 발행 여부',
  payment_received TINYINT(1) NOT NULL DEFAULT 0 COMMENT '입금 확인 여부',
  product_arrived TINYINT(1) NOT NULL DEFAULT 0 COMMENT '제품 도착 여부',
  statement_file_path VARCHAR(500) NULL COMMENT '명세서 파일 경로',
  payment_proof_image VARCHAR(500) NULL COMMENT '입금 내역 이미지 URL',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',

  INDEX idx_shop_order_id (shop_order_id),
  INDEX idx_sort_order (shop_order_id, sort_order),

  FOREIGN KEY (shop_order_id) REFERENCES kr_shop_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='판매 주문 라인';

-- 기존 주문 진행 데이터를 첫 번째 라인으로 이전
INSERT INTO kr_shop_order_lines (
  id,
  shop_order_id,
  sort_order,
  company_name,
  order_box_count,
  sale_unit_price,
  delivery_fee,
  total_amount,
  address,
  recipient_name,
  phone_number,
  tracking_number,
  statement_issued,
  payment_received,
  product_arrived,
  statement_file_path,
  payment_proof_image
)
SELECT
  CONCAT('line-', o.id),
  o.id,
  0,
  o.company_name,
  o.order_box_count,
  o.sale_unit_price,
  o.delivery_fee,
  o.total_amount,
  o.address,
  o.recipient_name,
  o.phone_number,
  o.tracking_number,
  o.statement_issued,
  o.payment_received,
  o.product_arrived,
  o.statement_file_path,
  o.payment_proof_image
FROM kr_shop_orders o
WHERE NOT EXISTS (
  SELECT 1 FROM kr_shop_order_lines l WHERE l.shop_order_id = o.id
);
