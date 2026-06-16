-- 마이그레이션: 122_create_kr_shop_shipments
-- 설명: 쇼핑몰 주문 배송(송장) 묶음·송장·주문건 연결 테이블
-- 날짜: 2026-06-14

CREATE TABLE IF NOT EXISTS kr_shop_shipment_batches (
  id VARCHAR(36) NOT NULL PRIMARY KEY COMMENT '송장 등록 묶음 ID',
  shipment_date DATE NOT NULL COMMENT '발송일',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_shipment_date (shipment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kr_shop_shipments (
  id VARCHAR(36) NOT NULL PRIMARY KEY COMMENT '송장 ID',
  batch_id VARCHAR(36) NOT NULL COMMENT '등록 묶음 ID',
  tracking_number VARCHAR(32) NOT NULL COMMENT '송장번호',
  logistics_company VARCHAR(32) NOT NULL DEFAULT '로젠' COMMENT '물류회사명',
  t_code VARCHAR(8) NOT NULL DEFAULT '06' COMMENT '스위트트래커 택배사 코드(로젠)',
  delivery_status ENUM('before_start', 'in_transit', 'delivered') NOT NULL DEFAULT 'before_start' COMMENT '배송상태',
  shipment_box_count INT NULL COMMENT '송장 박스수',
  delivery_fee INT NULL COMMENT '택배비',
  box_price INT NULL COMMENT '박스가격',
  last_tracking_kind VARCHAR(255) NULL COMMENT '마지막 배송 단계',
  last_tracking_at DATETIME NULL COMMENT '마지막 배송 일시',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_batch_id (batch_id),
  INDEX idx_tracking_number (tracking_number),
  CONSTRAINT fk_shop_shipments_batch
    FOREIGN KEY (batch_id) REFERENCES kr_shop_shipment_batches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kr_shop_shipment_lines (
  id VARCHAR(36) NOT NULL PRIMARY KEY COMMENT '송장-주문건 연결 ID',
  shipment_id VARCHAR(36) NOT NULL COMMENT '송장 ID',
  shop_order_id VARCHAR(36) NOT NULL COMMENT '주문 ID',
  line_id VARCHAR(36) NOT NULL COMMENT '주문 라인 ID',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_shop_shipment_line (line_id),
  INDEX idx_shipment_id (shipment_id),
  INDEX idx_shop_order_id (shop_order_id),
  CONSTRAINT fk_shop_shipment_lines_shipment
    FOREIGN KEY (shipment_id) REFERENCES kr_shop_shipments(id) ON DELETE CASCADE,
  CONSTRAINT fk_shop_shipment_lines_order
    FOREIGN KEY (shop_order_id) REFERENCES kr_shop_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_shop_shipment_lines_line
    FOREIGN KEY (line_id) REFERENCES kr_shop_order_lines(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
