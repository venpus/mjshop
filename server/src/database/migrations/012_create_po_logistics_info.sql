-- 마이그레이션: 012_create_po_logistics_info
-- 설명: 물류 정보 테이블 생성
-- 날짜: 2024-12-24

CREATE TABLE IF NOT EXISTS logistics_info (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '물류 정보 ID',
  delivery_set_id INT NOT NULL COMMENT '배송 세트 ID (FK)',
  
  -- 물류 정보
  tracking_number VARCHAR(255) NULL COMMENT '운송장 번호',
  company VARCHAR(255) NULL COMMENT '물류 회사명',
  
  -- 표시 순서
  display_order INT NOT NULL DEFAULT 0 COMMENT '표시 순서',
  
  -- 메타데이터
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  
  -- 외래키 제약조건
  FOREIGN KEY (delivery_set_id) REFERENCES delivery_sets(id) ON DELETE CASCADE,
  
  -- 인덱스
  INDEX idx_delivery_set_id (delivery_set_id),
  INDEX idx_tracking_number (tracking_number),
  INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='물류 정보 테이블';

