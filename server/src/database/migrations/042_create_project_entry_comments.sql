-- 마이그레이션: 042_create_project_entry_comments
-- 설명: 프로젝트 항목 댓글 테이블 생성
-- 날짜: 2024-12-27

CREATE TABLE IF NOT EXISTS project_entry_comments (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '댓글 ID',
  entry_id INT NOT NULL COMMENT '항목 ID (FK)',
  
  -- 댓글 정보
  content TEXT NOT NULL COMMENT '댓글 내용',
  user_id VARCHAR(50) NOT NULL COMMENT '작성자 ID',
  
  -- 메타데이터
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  
  -- 외래키 제약조건
  FOREIGN KEY (entry_id) REFERENCES project_entries(id) ON DELETE CASCADE,
  
  -- 인덱스 (최신순 조회 최적화)
  INDEX idx_entry_id_created (entry_id, created_at DESC),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='프로젝트 항목 댓글 테이블';

