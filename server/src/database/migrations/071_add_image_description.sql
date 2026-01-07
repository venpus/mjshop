-- 마이그레이션: 071_add_image_description
-- 설명: 프로젝트 항목 이미지에 설명 필드 추가
-- 날짜: 2024-12-28

ALTER TABLE project_entry_images
ADD COLUMN description TEXT NULL COMMENT '이미지 설명';

