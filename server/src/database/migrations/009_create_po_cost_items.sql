-- 마이그레이션: 009_create_po_cost_items
-- 설명: 발주 비용 항목 테이블 생성 (옵션/인건비 통합)
-- 날짜: 2024-12-24

CREATE TABLE IF NOT EXISTS po_cost_items (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '비용 항목 ID',
  purchase_order_id VARCHAR(50) NOT NULL COMMENT '발주 ID (FK)',
  
  -- 비용 항목 정보
  item_type ENUM('option', 'labor') NOT NULL COMMENT '항목 유형 (옵션/인건비)',
  name VARCHAR(255) NOT NULL COMMENT '항목명',
  cost DECIMAL(10, 2) NOT NULL COMMENT '비용',
  
  -- 표시 순서
  display_order INT NOT NULL DEFAULT 0 COMMENT '표시 순서',
  
  -- 메타데이터
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  
  -- 외래키 제약조건
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  
  -- 인덱스
  INDEX idx_po_id (purchase_order_id),
  INDEX idx_item_type (item_type),
  INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='발주 비용 항목 테이블 (옵션/인건비 통합)';

