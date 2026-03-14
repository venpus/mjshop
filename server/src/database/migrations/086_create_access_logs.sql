-- 마이그레이션: 086_create_access_logs
-- 설명: 사이트 접속 로그 테이블 생성 (접속 ID, 시간, IP, URL, 기기)
-- 날짜: 2025-03-14

CREATE TABLE IF NOT EXISTS access_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '접속 로그 ID',
  user_id VARCHAR(50) NOT NULL COMMENT '접속한 관리자 ID (admin_accounts.id)',
  accessed_at DATETIME NOT NULL COMMENT '접속 시각',
  ip VARCHAR(45) NULL COMMENT '접속 IP',
  url VARCHAR(2048) NOT NULL DEFAULT '' COMMENT '접속 URL',
  device VARCHAR(20) NOT NULL DEFAULT 'PC' COMMENT '기기 구분 (PC / Mobile)',
  
  INDEX idx_user_accessed (user_id, accessed_at DESC),
  INDEX idx_accessed_at (accessed_at DESC),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사이트 접속 로그';
