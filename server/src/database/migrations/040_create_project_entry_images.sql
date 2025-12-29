-- 마이그레이션: 040_create_project_entry_images
-- 설명: 프로젝트 항목 이미지 테이블 생성
-- 날짜: 2024-12-27

CREATE TABLE IF NOT EXISTS project_entry_images (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '이미지 ID',
  entry_id INT NOT NULL COMMENT '항목 ID (FK)',
  
  -- 이미지 정보
  image_url VARCHAR(500) NOT NULL COMMENT '이미지 경로',
  display_order INT NOT NULL DEFAULT 0 COMMENT '표시 순서',
  
  -- 메타데이터
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  
  -- 외래키 제약조건
  FOREIGN KEY (entry_id) REFERENCES project_entries(id) ON DELETE CASCADE,
  
  -- 인덱스
  INDEX idx_entry_id (entry_id),
  INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='프로젝트 항목 이미지 테이블';

