-- 마이그레이션: 025_create_materials
-- 설명: 부자재 관리 메인 테이블 생성
-- 날짜: 2024-12-24

CREATE TABLE IF NOT EXISTS materials (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '부자재 ID',
  code VARCHAR(50) NOT NULL UNIQUE COMMENT '부자재 코드 (예: MAT001)',
  
  -- 기본 정보
  date DATE NOT NULL COMMENT '날짜',
  product_name VARCHAR(255) NOT NULL COMMENT '상품명 (한국어)',
  product_name_chinese VARCHAR(255) NULL COMMENT '상품명 (중국어)',
  category VARCHAR(50) NOT NULL COMMENT '카테고리 (펜던트, 패치, 목걸이, 열쇠고리, 택, 파우치, 박스)',
  type_count INT NOT NULL DEFAULT 1 COMMENT '종류 수',
  link VARCHAR(500) NULL COMMENT '링크',
  price DECIMAL(10, 2) NULL COMMENT '단가 (¥)',
  
  -- 상태
  purchase_complete BOOLEAN NOT NULL DEFAULT FALSE COMMENT '구매완료 여부',
  current_stock INT NOT NULL DEFAULT 0 COMMENT '현재 재고',
  
  -- 메타데이터
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  created_by VARCHAR(50) NULL COMMENT '생성자 ID',
  updated_by VARCHAR(50) NULL COMMENT '수정자 ID',
  
  -- 인덱스
  INDEX idx_code (code),
  INDEX idx_category (category),
  INDEX idx_date (date),
  INDEX idx_purchase_complete (purchase_complete),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='부자재 관리 메인 테이블';

