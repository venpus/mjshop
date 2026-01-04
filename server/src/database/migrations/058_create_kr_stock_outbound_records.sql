-- 마이그레이션: 058_create_kr_stock_outbound_records
-- 설명: 재고 출고 기록 테이블 생성
-- 날짜: 2024-12-28

CREATE TABLE IF NOT EXISTS kr_stock_outbound_records (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '출고 기록 ID',
  group_key VARCHAR(255) NOT NULL COMMENT '재고 그룹 키 (purchase_order_id-product_name 형식)',
  outbound_date DATE NOT NULL COMMENT '출고 날짜',
  customer_name VARCHAR(255) NOT NULL COMMENT '고객 이름',
  quantity INT NOT NULL COMMENT '출고 수량',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  created_by VARCHAR(50) NULL COMMENT '생성자 ID',
  updated_by VARCHAR(50) NULL COMMENT '수정자 ID',
  
  INDEX idx_group_key (group_key),
  INDEX idx_outbound_date (outbound_date),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='재고 출고 기록 테이블';

