-- 마이그레이션: 010_create_po_delivery_sets
-- 설명: 배송 세트 테이블 생성
-- 날짜: 2024-12-24

CREATE TABLE IF NOT EXISTS delivery_sets (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '배송 세트 ID',
  purchase_order_id VARCHAR(50) NOT NULL COMMENT '발주 ID (FK)',
  
  -- 배송 세트 정보
  packing_code VARCHAR(100) NOT NULL COMMENT '포장 코드',
  packing_date DATE NULL COMMENT '포장일',
  
  -- 표시 순서
  display_order INT NOT NULL DEFAULT 0 COMMENT '표시 순서',
  
  -- 메타데이터
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  
  -- 외래키 제약조건
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  
  -- 인덱스
  INDEX idx_po_id (purchase_order_id),
  INDEX idx_packing_code (packing_code),
  INDEX idx_packing_date (packing_date),
  INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='배송 세트 테이블';

