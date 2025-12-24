-- 마이그레이션: 003_create_products
-- 설명: 상품 테이블 생성
-- 날짜: 2024-12-24

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(50) PRIMARY KEY COMMENT '상품 ID',
  name VARCHAR(255) NOT NULL COMMENT '상품명 (한국어)',
  name_chinese VARCHAR(255) NULL COMMENT '상품명 (중국어)',
  category VARCHAR(50) NOT NULL COMMENT '카테고리 (봉제, 키링, 피규어, 잡화)',
  price DECIMAL(10, 2) NOT NULL COMMENT '가격 (원)',
  stock INT NOT NULL DEFAULT 0 COMMENT '재고 수량',
  status ENUM('판매중', '품절', '숨김') NOT NULL DEFAULT '판매중' COMMENT '판매 상태',
  size VARCHAR(100) NULL COMMENT '상품 크기',
  packaging_size VARCHAR(100) NULL COMMENT '포장 크기',
  weight VARCHAR(50) NULL COMMENT '무게',
  set_count INT NOT NULL DEFAULT 1 COMMENT '세트 수량',
  small_pack_count INT NOT NULL DEFAULT 1 COMMENT '소포장 개수',
  box_count INT NOT NULL DEFAULT 1 COMMENT '박스당 개수',
  main_image VARCHAR(500) NULL COMMENT '메인 이미지 URL/경로',
  supplier_id INT NULL COMMENT '공급업체 ID (FK)',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  created_by VARCHAR(50) NULL COMMENT '생성자 ID',
  updated_by VARCHAR(50) NULL COMMENT '수정자 ID',
  
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  INDEX idx_category (category),
  INDEX idx_status (status),
  INDEX idx_supplier_id (supplier_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='상품 테이블';

