-- 마이그레이션: 028_create_material_test_image_metadata
-- 설명: 부자재 테스트 이미지 메타데이터 테이블 생성 (좋아요/싫어요, 메모, 확인 여부)
-- 날짜: 2024-12-24

CREATE TABLE IF NOT EXISTS material_test_image_metadata (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '메타데이터 ID',
  material_id INT NOT NULL COMMENT '부자재 ID (FK)',
  image_url VARCHAR(500) NOT NULL COMMENT '이미지 URL (material_images의 image_url과 매칭)',
  
  -- 반응 (좋아요/싫어요)
  reaction ENUM('like', 'dislike') NULL COMMENT '반응 (좋아요, 싫어요)',
  
  -- 의견 메모
  memo TEXT NULL COMMENT '의견 메모',
  
  -- 확인 여부
  confirmed_by VARCHAR(50) NULL COMMENT '확인한 관리자 이름',
  confirmed_at DATETIME NULL COMMENT '확인 시간',
  
  -- 메타데이터
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  
  -- 외래키 제약조건
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
  
  -- 제약조건: 한 이미지당 하나의 메타데이터만 허용
  UNIQUE KEY unique_material_image (material_id, image_url),
  
  -- 인덱스
  INDEX idx_material_id (material_id),
  INDEX idx_image_url (image_url)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='부자재 테스트 이미지 메타데이터 테이블';


