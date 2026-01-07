-- 마이그레이션: 065_update_projects_table_add_new_fields
-- 설명: 프로젝트 테이블에 새 필드 추가 및 status ENUM 수정
-- 날짜: 2024-12-28

-- 1. status ENUM에 '홀딩중', '완성' 추가 (기존 'PENDING' 유지)
ALTER TABLE projects 
MODIFY COLUMN status ENUM('진행중', 'PENDING', '홀딩중', '취소', '완성') NOT NULL DEFAULT '진행중';

-- 2. 기존 'PENDING' 값을 '홀딩중'으로 변경
UPDATE projects SET status = '홀딩중' WHERE status = 'PENDING';

-- 3. status ENUM에서 'PENDING' 제거
ALTER TABLE projects 
MODIFY COLUMN status ENUM('진행중', '홀딩중', '취소', '완성') NOT NULL DEFAULT '진행중';

-- 4. 새 필드 추가
ALTER TABLE projects
ADD COLUMN requirements TEXT NULL COMMENT '요청 사항',
ADD COLUMN last_entry_content TEXT NULL COMMENT '최종 항목 내용 (성능 최적화)',
ADD COLUMN confirmed_image_url VARCHAR(500) NULL COMMENT '확정된 이미지 URL (성능 최적화)',
ADD COLUMN thumbnail_image_url VARCHAR(500) NULL COMMENT '목록용 썸네일 이미지';

-- 5. 인덱스 추가
CREATE INDEX idx_confirmed_image ON projects(confirmed_image_url);
CREATE INDEX idx_thumbnail_image ON projects(thumbnail_image_url);

