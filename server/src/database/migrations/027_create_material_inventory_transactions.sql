-- 마이그레이션: 027_create_material_inventory_transactions
-- 설명: 부자재 입출고 기록 테이블 생성
-- 날짜: 2024-12-24

CREATE TABLE IF NOT EXISTS material_inventory_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '입출고 기록 ID',
  material_id INT NOT NULL COMMENT '부자재 ID (FK)',
  transaction_date DATE NOT NULL COMMENT '입출고 날짜',
  transaction_type ENUM('in', 'out') NOT NULL COMMENT '입출고 구분 (in: 입고, out: 출고)',
  quantity INT NOT NULL COMMENT '입출고 수량',
  related_order VARCHAR(50) NULL COMMENT '관련 발주 번호',
  notes TEXT NULL COMMENT '비고',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  created_by VARCHAR(50) NULL COMMENT '작성자 ID',
  
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
  INDEX idx_material_id (material_id),
  INDEX idx_transaction_date (transaction_date),
  INDEX idx_material_date (material_id, transaction_date),
  INDEX idx_related_order (related_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='부자재 입출고 기록 테이블';

