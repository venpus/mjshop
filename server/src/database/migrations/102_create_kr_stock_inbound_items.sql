-- 마이그레이션: 102_create_kr_stock_inbound_items
-- 설명: 재고 입고 항목 테이블 (발주 기반 수동 입고)
-- 날짜: 2026-06-14

CREATE TABLE IF NOT EXISTS kr_stock_inbound_items (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '입고 항목 ID',
  purchase_order_id VARCHAR(50) NOT NULL COMMENT '발주 ID (FK)',
  group_key VARCHAR(255) NOT NULL COMMENT '재고 그룹 키 (purchase_order_id-product_name)',
  product_id VARCHAR(50) NULL COMMENT '상품 ID',
  product_name VARCHAR(255) NOT NULL COMMENT '상품명',
  po_number VARCHAR(100) NULL COMMENT '발주번호',
  product_main_image VARCHAR(500) NULL COMMENT '상품 이미지 URL',
  unit_price DECIMAL(12, 2) NULL COMMENT '단가 (CNY)',
  inbound_quantity INT NOT NULL DEFAULT 0 COMMENT '입고 수량',
  selling_price DECIMAL(12, 2) NULL COMMENT '판매가 (KRW)',
  stock_quantity INT NOT NULL DEFAULT 0 COMMENT '재고 수량',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  created_by VARCHAR(50) NULL COMMENT '생성자 ID',

  UNIQUE KEY uk_purchase_order_id (purchase_order_id),
  INDEX idx_group_key (group_key),
  INDEX idx_product_name (product_name),
  INDEX idx_created_at (created_at),

  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='재고 입고 항목 테이블';
