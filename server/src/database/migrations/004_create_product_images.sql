-- 마이그레이션: 004_create_product_images
-- 설명: 상품 이미지 테이블 생성
-- 날짜: 2024-12-24

CREATE TABLE IF NOT EXISTS product_images (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '이미지 ID',
  product_id VARCHAR(50) NOT NULL COMMENT '상품 ID (FK)',
  image_url VARCHAR(500) NOT NULL COMMENT '이미지 URL/경로',
  display_order INT NOT NULL DEFAULT 0 COMMENT '표시 순서',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_id (product_id),
  INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='상품 이미지 테이블';

