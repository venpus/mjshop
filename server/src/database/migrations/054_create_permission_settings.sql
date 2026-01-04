-- 마이그레이션: 054_create_permission_settings
-- 설명: 권한 설정 테이블 생성
-- 날짜: 2024-12-24

CREATE TABLE IF NOT EXISTS permission_settings (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '권한 설정 ID',
  resource VARCHAR(100) NOT NULL COMMENT '리소스 이름 (예: purchase-orders, payment-history)',
  level ENUM('A-SuperAdmin', 'S: Admin', 'B0: 중국Admin', 'C0: 한국Admin') NOT NULL COMMENT '관리자 레벨',
  can_read BOOLEAN NOT NULL DEFAULT FALSE COMMENT '읽기 권한',
  can_write BOOLEAN NOT NULL DEFAULT FALSE COMMENT '쓰기 권한',
  can_delete BOOLEAN NOT NULL DEFAULT FALSE COMMENT '삭제 권한',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  
  UNIQUE KEY uk_resource_level (resource, level),
  INDEX idx_resource (resource),
  INDEX idx_level (level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='권한 설정 테이블';

