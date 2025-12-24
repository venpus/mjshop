-- 마이그레이션: 002_create_suppliers
-- 설명: 공급업체 테이블 생성
-- 날짜: 2024-12-24

CREATE TABLE IF NOT EXISTS suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '공급업체 ID',
  name VARCHAR(255) NOT NULL COMMENT '공급업체명',
  url VARCHAR(500) NULL COMMENT '공급업체 URL',
  contact_person VARCHAR(100) NULL COMMENT '담당자명',
  contact_phone VARCHAR(20) NULL COMMENT '담당자 연락처',
  contact_email VARCHAR(255) NULL COMMENT '담당자 이메일',
  address TEXT NULL COMMENT '주소',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='공급업체 테이블';

