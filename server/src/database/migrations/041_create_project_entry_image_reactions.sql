-- 마이그레이션: 041_create_project_entry_image_reactions
-- 설명: 프로젝트 항목 이미지 반응 테이블 생성 (좋아요/싫어요)
-- 날짜: 2024-12-27

CREATE TABLE IF NOT EXISTS project_entry_image_reactions (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '반응 ID',
  image_id INT NOT NULL COMMENT '이미지 ID (FK)',
  user_id VARCHAR(50) NOT NULL COMMENT '사용자 ID',
  reaction ENUM('like', 'dislike') NOT NULL COMMENT '반응 (좋아요, 싫어요)',
  
  -- 메타데이터
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  
  -- 외래키 제약조건
  FOREIGN KEY (image_id) REFERENCES project_entry_images(id) ON DELETE CASCADE,
  
  -- 제약조건: 한 사용자당 한 이미지에 하나의 반응만 허용
  UNIQUE KEY unique_user_image (image_id, user_id),
  
  -- 인덱스
  INDEX idx_image_id (image_id),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='프로젝트 항목 이미지 반응 테이블';

