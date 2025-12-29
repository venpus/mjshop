-- 마이그레이션: 038_create_projects
-- 설명: 프로젝트 테이블 생성
-- 날짜: 2024-12-27

CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '프로젝트 ID',
  name VARCHAR(255) NOT NULL COMMENT '프로젝트명',
  status ENUM('진행중', 'PENDING', '취소') NOT NULL DEFAULT '진행중' COMMENT '상태',
  start_date DATE NOT NULL COMMENT '시작일',
  
  -- 메타데이터
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  created_by VARCHAR(50) NULL COMMENT '생성자 ID',
  updated_by VARCHAR(50) NULL COMMENT '수정자 ID',
  
  -- 인덱스
  INDEX idx_status (status),
  INDEX idx_start_date (start_date),
  INDEX idx_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='프로젝트 테이블';

