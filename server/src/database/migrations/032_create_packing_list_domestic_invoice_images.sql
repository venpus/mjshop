-- 마이그레이션: 032_create_packing_list_domestic_invoice_images
-- 설명: 패킹리스트 내륙송장 이미지 테이블 생성
-- 날짜: 2024-12-24

CREATE TABLE IF NOT EXISTS packing_list_domestic_invoice_images (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '송장 이미지 ID',
  domestic_invoice_id INT NOT NULL COMMENT '내륙송장 ID (FK)',
  image_url VARCHAR(500) NOT NULL COMMENT '이미지 URL/경로',
  display_order INT NOT NULL DEFAULT 0 COMMENT '표시 순서 (최대 10장)',
  
  -- 메타데이터
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  
  -- 외래키 제약조건
  FOREIGN KEY (domestic_invoice_id) REFERENCES packing_list_domestic_invoices(id) ON DELETE CASCADE,
  
  -- 인덱스
  INDEX idx_domestic_invoice_id (domestic_invoice_id),
  INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='패킹리스트 내륙송장 이미지 테이블';

