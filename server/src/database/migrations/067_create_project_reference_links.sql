-- 마이그레이션: 067_create_project_reference_links
-- 설명: 프로젝트 참고 링크 테이블 생성
-- 날짜: 2024-12-28

CREATE TABLE IF NOT EXISTS project_reference_links (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '링크 ID',
  project_id INT NOT NULL COMMENT '프로젝트 ID (FK)',
  
  -- 링크 정보
  title VARCHAR(255) NULL COMMENT '링크 제목 (선택)',
  url VARCHAR(500) NOT NULL COMMENT '링크 URL',
  display_order INT NOT NULL DEFAULT 0 COMMENT '표시 순서',
  
  -- 메타데이터
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  
  -- 외래키 제약조건
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  
  -- 인덱스
  INDEX idx_project_id (project_id),
  INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='프로젝트 참고 링크 테이블';

