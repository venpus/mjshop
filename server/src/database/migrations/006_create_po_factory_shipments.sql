-- 마이그레이션: 006_create_po_factory_shipments
-- 설명: 공장 출고 테이블 생성
-- 날짜: 2024-12-24

CREATE TABLE IF NOT EXISTS factory_shipments (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '출고 ID',
  purchase_order_id VARCHAR(50) NOT NULL COMMENT '발주 ID (FK)',
  
  -- 출고 정보
  shipment_date DATE NULL COMMENT '출고일',
  quantity INT NOT NULL COMMENT '출고 수량',
  tracking_number VARCHAR(255) NULL COMMENT '운송장 번호',
  receive_date DATE NULL COMMENT '수령일',
  
  -- 표시 순서
  display_order INT NOT NULL DEFAULT 0 COMMENT '표시 순서',
  
  -- 메타데이터
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  
  -- 외래키 제약조건
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  
  -- 인덱스
  INDEX idx_po_id (purchase_order_id),
  INDEX idx_shipment_date (shipment_date),
  INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='공장 출고 테이블';

