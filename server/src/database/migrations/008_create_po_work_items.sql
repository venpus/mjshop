-- 마이그레이션: 008_create_po_work_items
-- 설명: 가공/포장 작업 항목 테이블 생성
-- 날짜: 2024-12-24

CREATE TABLE IF NOT EXISTS work_items (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '작업 항목 ID',
  purchase_order_id VARCHAR(50) NOT NULL COMMENT '발주 ID (FK)',
  
  -- 작업 정보
  image_url VARCHAR(500) NULL COMMENT '작업 이미지 URL',
  description_ko TEXT NULL COMMENT '한국어 설명',
  description_zh TEXT NULL COMMENT '중국어 설명',
  is_completed BOOLEAN NOT NULL DEFAULT FALSE COMMENT '완료 여부',
  
  -- 표시 순서
  display_order INT NOT NULL DEFAULT 0 COMMENT '표시 순서',
  
  -- 메타데이터
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  
  -- 외래키 제약조건
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  
  -- 인덱스
  INDEX idx_po_id (purchase_order_id),
  INDEX idx_is_completed (is_completed),
  INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='가공/포장 작업 항목 테이블';

