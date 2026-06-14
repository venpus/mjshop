-- 마이그레이션: 104_create_kr_shop_orders
-- 설명: 주문 관리(재고 → 판매 주문) 테이블
-- 날짜: 2026-06-14

CREATE TABLE IF NOT EXISTS kr_shop_orders (
  id VARCHAR(50) NOT NULL PRIMARY KEY COMMENT '주문 ID',
  order_number VARCHAR(100) NOT NULL COMMENT '주문번호',
  stock_inbound_item_id INT NULL COMMENT '입고 항목 ID (FK)',
  purchase_order_id VARCHAR(50) NULL COMMENT '연결 발주 ID',
  product_id VARCHAR(50) NULL COMMENT '상품 ID',
  product_name VARCHAR(255) NOT NULL COMMENT '상품명',
  product_main_image VARCHAR(500) NULL COMMENT '상품 이미지 URL',
  unit_price DECIMAL(12, 2) NULL COMMENT '원가 단가 (CNY)',
  quantity INT NOT NULL DEFAULT 0 COMMENT '주문 수량',
  stock_quantity INT NOT NULL DEFAULT 0 COMMENT '재고 수량',
  selling_price DECIMAL(12, 2) NULL COMMENT '판매가 (KRW)',
  status ENUM('판매대기', '판매중', '품절', '판매완료') NOT NULL DEFAULT '판매대기' COMMENT '판매 상태',
  order_date DATE NULL COMMENT '등록일',
  note TEXT NULL COMMENT '메모',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  created_by VARCHAR(50) NULL COMMENT '생성자 ID',

  UNIQUE KEY uk_order_number (order_number),
  UNIQUE KEY uk_stock_inbound_item_id (stock_inbound_item_id),
  INDEX idx_product_name (product_name),
  INDEX idx_status (status),
  INDEX idx_order_date (order_date),
  INDEX idx_created_at (created_at),

  FOREIGN KEY (stock_inbound_item_id) REFERENCES kr_stock_inbound_items(id) ON DELETE SET NULL,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='주문 관리 테이블';
