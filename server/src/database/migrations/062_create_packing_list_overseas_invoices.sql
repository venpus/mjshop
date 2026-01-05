-- 마이그레이션: 062_create_packing_list_overseas_invoices
-- 설명: 패킹리스트 해외송장 테이블 생성
-- 날짜: 2024-12-24

CREATE TABLE IF NOT EXISTS packing_list_overseas_invoices (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '해외송장 ID',
  packing_list_id INT NOT NULL COMMENT '패킹리스트 ID (FK)',
  invoice_number VARCHAR(16) NOT NULL COMMENT '해외송장 번호 (16자리)',
  status ENUM('출발대기', '배송중', '도착완료') NOT NULL DEFAULT '출발대기' COMMENT '상태',
  inspection_quantity INT NOT NULL DEFAULT 0 COMMENT '검수수량',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  
  FOREIGN KEY (packing_list_id) REFERENCES packing_lists(id) ON DELETE CASCADE,
  INDEX idx_packing_list_id (packing_list_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='패킹리스트 해외송장 테이블';

