-- 마이그레이션: 000_create_migrations_table
-- 설명: 마이그레이션 이력 추적을 위한 테이블 생성
-- 날짜: 2024-01-01

CREATE TABLE IF NOT EXISTS migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE COMMENT '마이그레이션 파일명',
  executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '실행 시간',
  INDEX idx_filename (filename)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='마이그레이션 이력 테이블';

