-- 마이그레이션: 087_create_normal_invoice_entries
-- 설명: 정상 인보이스 엔트리 테이블 (날짜, 제품명)
-- 날짜: 2025-03-14

CREATE TABLE IF NOT EXISTS normal_invoice_entries (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '엔트리 ID',
  entry_date DATE NOT NULL COMMENT '날짜',
  product_name VARCHAR(500) NOT NULL COMMENT '제품명',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  INDEX idx_entry_date (entry_date),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='정상 인보이스 엔트리';
