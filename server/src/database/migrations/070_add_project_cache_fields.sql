-- 마이그레이션: 070_add_project_cache_fields
-- 설명: 프로젝트 목록 조회 성능 최적화를 위한 캐싱 필드 추가
-- 날짜: 2024-12-28

-- 프로젝트 테이블에 캐싱 필드 추가
ALTER TABLE projects
ADD COLUMN last_entry_date DATE NULL COMMENT '최종 항목 날짜 (성능 최적화)',
ADD COLUMN last_entry_author_id VARCHAR(50) NULL COMMENT '최종 항목 작성자 ID (성능 최적화)',
ADD COLUMN last_entry_author_name VARCHAR(100) NULL COMMENT '최종 항목 작성자 이름 (성능 최적화)',
ADD COLUMN last_comment_content TEXT NULL COMMENT '최신 댓글 내용 (성능 최적화)',
ADD COLUMN last_comment_author_id VARCHAR(50) NULL COMMENT '최신 댓글 작성자 ID (성능 최적화)',
ADD COLUMN last_comment_author_name VARCHAR(100) NULL COMMENT '최신 댓글 작성자 이름 (성능 최적화)',
ADD COLUMN last_comment_date DATETIME NULL COMMENT '최신 댓글 작성일 (성능 최적화)';

-- 인덱스 추가 (조회 성능 최적화)
CREATE INDEX idx_last_entry_date ON projects(last_entry_date DESC);
CREATE INDEX idx_last_comment_date ON projects(last_comment_date DESC);

-- 기존 데이터 업데이트 (최종 항목 정보)
UPDATE projects p
SET 
  last_entry_date = (
    SELECT pe.date 
    FROM project_entries pe
    WHERE pe.project_id = p.id
    ORDER BY pe.date DESC, pe.created_at DESC
    LIMIT 1
  ),
  last_entry_author_id = (
    SELECT pe.created_by 
    FROM project_entries pe
    WHERE pe.project_id = p.id
    ORDER BY pe.date DESC, pe.created_at DESC
    LIMIT 1
  ),
  last_entry_author_name = (
    SELECT a.name 
    FROM project_entries pe
    LEFT JOIN admin_accounts a ON pe.created_by = a.id
    WHERE pe.project_id = p.id
    ORDER BY pe.date DESC, pe.created_at DESC
    LIMIT 1
  )
WHERE EXISTS (
  SELECT 1 FROM project_entries pe WHERE pe.project_id = p.id
);

-- 기존 데이터 업데이트 (최신 댓글 정보)
UPDATE projects p
SET 
  last_comment_content = (
    SELECT cec.content 
    FROM project_entry_comments cec
    INNER JOIN project_entries pe ON cec.entry_id = pe.id
    WHERE pe.project_id = p.id
    ORDER BY pe.date DESC, pe.created_at DESC, cec.created_at DESC
    LIMIT 1
  ),
  last_comment_author_id = (
    SELECT cec.user_id 
    FROM project_entry_comments cec
    INNER JOIN project_entries pe ON cec.entry_id = pe.id
    WHERE pe.project_id = p.id
    ORDER BY pe.date DESC, pe.created_at DESC, cec.created_at DESC
    LIMIT 1
  ),
  last_comment_author_name = (
    SELECT a.name 
    FROM project_entry_comments cec
    INNER JOIN project_entries pe ON cec.entry_id = pe.id
    LEFT JOIN admin_accounts a ON cec.user_id = a.id
    WHERE pe.project_id = p.id
    ORDER BY pe.date DESC, pe.created_at DESC, cec.created_at DESC
    LIMIT 1
  ),
  last_comment_date = (
    SELECT cec.created_at 
    FROM project_entry_comments cec
    INNER JOIN project_entries pe ON cec.entry_id = pe.id
    WHERE pe.project_id = p.id
    ORDER BY pe.date DESC, pe.created_at DESC, cec.created_at DESC
    LIMIT 1
  )
WHERE EXISTS (
  SELECT 1 
  FROM project_entry_comments cec
  INNER JOIN project_entries pe ON cec.entry_id = pe.id
  WHERE pe.project_id = p.id
);

