-- 마이그레이션: 106_create_kr_shop_buyers
-- 설명: 쇼핑몰 구매자 및 택배 주소지 테이블
-- 날짜: 2026-06-14

CREATE TABLE IF NOT EXISTS kr_shop_buyers (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '구매자 ID',
  company_name VARCHAR(255) NOT NULL COMMENT '상호명',
  kakao_id VARCHAR(100) NULL COMMENT '카톡 아이디',
  business_registration_number VARCHAR(50) NULL COMMENT '사업자등록증 번호',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  created_by VARCHAR(50) NULL COMMENT '생성자 ID',

  INDEX idx_company_name (company_name),
  INDEX idx_kakao_id (kakao_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='쇼핑몰 구매자';

CREATE TABLE IF NOT EXISTS kr_shop_buyer_addresses (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '주소 ID',
  buyer_id INT NOT NULL COMMENT '구매자 ID (FK)',
  address VARCHAR(500) NOT NULL COMMENT '택배 주소지',
  recipient_name VARCHAR(100) NOT NULL COMMENT '수령인',
  phone_number VARCHAR(50) NOT NULL COMMENT '전화번호',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '정렬 순서',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',

  INDEX idx_buyer_id (buyer_id),
  FOREIGN KEY (buyer_id) REFERENCES kr_shop_buyers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='구매자 택배 주소지';
