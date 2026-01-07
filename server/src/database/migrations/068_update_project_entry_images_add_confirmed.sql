-- 마이그레이션: 068_update_project_entry_images_add_confirmed
-- 설명: 프로젝트 항목 이미지 테이블에 확정 필드 추가
-- 날짜: 2024-12-28

ALTER TABLE project_entry_images
ADD COLUMN is_confirmed BOOLEAN NOT NULL DEFAULT FALSE COMMENT '확정 여부',
ADD COLUMN confirmed_at DATETIME NULL COMMENT '확정 시각';

-- 인덱스 추가
CREATE INDEX idx_is_confirmed ON project_entry_images(is_confirmed, confirmed_at DESC);

