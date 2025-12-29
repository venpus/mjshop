-- 마이그레이션: 039_create_project_entries
-- 설명: 프로젝트 항목 테이블 생성
-- 날짜: 2024-12-27

CREATE TABLE IF NOT EXISTS project_entries (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '항목 ID',
  project_id INT NOT NULL COMMENT '프로젝트 ID (FK)',
  
  -- 항목 정보
  date DATE NOT NULL COMMENT '날짜',
  title VARCHAR(255) NOT NULL COMMENT '제목',
  content TEXT NULL COMMENT '내용',
  
  -- 메타데이터
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  created_by VARCHAR(50) NULL COMMENT '생성자 ID',
  updated_by VARCHAR(50) NULL COMMENT '수정자 ID',
  
  -- 외래키 제약조건
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  
  -- 인덱스 (최신 날짜 순 조회 최적화)
  INDEX idx_project_id_date (project_id, date DESC),
  INDEX idx_date (date DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='프로젝트 항목 테이블';

