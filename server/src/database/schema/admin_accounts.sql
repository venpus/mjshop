-- 관리자 계정 테이블 생성
-- 데이터베이스: wk_megafactory

CREATE TABLE IF NOT EXISTS admin_accounts (
  id VARCHAR(50) PRIMARY KEY COMMENT '관리자 ID',
  name VARCHAR(100) NOT NULL COMMENT '이름',
  phone VARCHAR(20) NOT NULL COMMENT '연락처',
  email VARCHAR(255) NOT NULL UNIQUE COMMENT '이메일',
  password_hash VARCHAR(255) NOT NULL COMMENT '비밀번호 해시',
  level ENUM('A-SuperAdmin', 'S: Admin', 'B0: 중국Admin', 'C0: 한국Admin', 'D0: 비전 담당자') NOT NULL DEFAULT 'C0: 한국Admin' COMMENT '권한 레벨',
  is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '활성화 여부',
  last_login_at DATETIME NULL COMMENT '마지막 로그인 시간',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  created_by VARCHAR(50) NULL COMMENT '생성자 ID',
  updated_by VARCHAR(50) NULL COMMENT '수정자 ID',
  
  INDEX idx_email (email),
  INDEX idx_level (level),
  INDEX idx_is_active (is_active),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='관리자 계정 테이블';

