-- 마이그레이션: 069_create_project_views
-- 설명: 프로젝트 조회 이력 테이블 생성
-- 날짜: 2024-12-28

CREATE TABLE IF NOT EXISTS project_views (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '조회 ID',
  project_id INT NOT NULL COMMENT '프로젝트 ID (FK)',
  user_id VARCHAR(50) NOT NULL COMMENT '사용자 ID',
  viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '조회 시각',
  
  -- 외래키 제약조건
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  
  -- 인덱스
  INDEX idx_project_id (project_id),
  INDEX idx_user_id (user_id),
  INDEX idx_viewed_at (viewed_at DESC),
  INDEX idx_project_user (project_id, user_id, viewed_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='프로젝트 조회 이력 테이블';

