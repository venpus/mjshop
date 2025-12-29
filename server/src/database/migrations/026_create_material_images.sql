-- 마이그레이션: 026_create_material_images
-- 설명: 부자재 이미지 통합 관리 테이블 생성
-- 날짜: 2024-12-24

CREATE TABLE IF NOT EXISTS material_images (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '이미지 ID',
  material_id INT NOT NULL COMMENT '부자재 ID (FK)',
  
  -- 이미지 정보
  image_type ENUM('product', 'test') NOT NULL COMMENT '이미지 유형 (제품 사진, 테스트 사진)',
  image_url VARCHAR(500) NOT NULL COMMENT '이미지 경로',
  
  -- 표시 순서
  display_order INT NOT NULL DEFAULT 0 COMMENT '표시 순서',
  
  -- 메타데이터
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  
  -- 외래키 제약조건
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
  
  -- 인덱스 (이미지 타입별 조회 최적화)
  INDEX idx_material_image_type (material_id, image_type),
  INDEX idx_image_type (image_type),
  INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='부자재 이미지 통합 관리 테이블';

