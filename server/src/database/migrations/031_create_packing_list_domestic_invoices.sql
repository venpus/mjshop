-- 마이그레이션: 031_create_packing_list_domestic_invoices
-- 설명: 패킹리스트 내륙송장 테이블 생성
-- 날짜: 2024-12-24

CREATE TABLE IF NOT EXISTS packing_list_domestic_invoices (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '내륙송장 ID',
  packing_list_id INT NOT NULL COMMENT '패킹리스트 ID (FK)',
  invoice_number VARCHAR(100) NOT NULL COMMENT '송장번호',
  
  -- 메타데이터
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  
  -- 외래키 제약조건
  FOREIGN KEY (packing_list_id) REFERENCES packing_lists(id) ON DELETE CASCADE,
  
  -- 인덱스
  INDEX idx_packing_list_id (packing_list_id),
  INDEX idx_invoice_number (invoice_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='패킹리스트 내륙송장 테이블';

