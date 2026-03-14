-- 마이그레이션: 088_create_normal_invoice_files
-- 설명: 정상 인보이스 파일 (인보이스 1개 + 사진자료 다수)
-- 날짜: 2025-03-14

CREATE TABLE IF NOT EXISTS normal_invoice_files (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '파일 ID',
  entry_id INT NOT NULL COMMENT '엔트리 ID (FK)',
  file_kind ENUM('invoice', 'photo') NOT NULL COMMENT 'invoice=인보이스파일, photo=사진자료',
  file_path VARCHAR(500) NOT NULL COMMENT '저장 경로 (uploads 기준 상대)',
  original_name VARCHAR(255) NOT NULL COMMENT '원본 파일명',
  display_order INT NOT NULL DEFAULT 0 COMMENT '표시 순서',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  FOREIGN KEY (entry_id) REFERENCES normal_invoice_entries(id) ON DELETE CASCADE,
  INDEX idx_entry_id (entry_id),
  INDEX idx_entry_kind (entry_id, file_kind)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='정상 인보이스 파일';
