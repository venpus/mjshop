-- 별도처리 금액 (결제내역 탭)
CREATE TABLE IF NOT EXISTS payment_misc_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entry_date DATE NOT NULL COMMENT '날짜',
  description TEXT NULL COMMENT '항목 내용',
  amount_cny DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT '지불금액(위안)',
  is_completed TINYINT(1) NOT NULL DEFAULT 0 COMMENT '완료처리',
  file_relative_path VARCHAR(500) NULL COMMENT '업로드 파일 상대경로(uploads 기준)',
  original_filename VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_entry_date (entry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='별도처리 금액';
