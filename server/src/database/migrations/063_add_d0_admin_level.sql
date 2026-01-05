-- 마이그레이션: 063_add_d0_admin_level
-- 설명: admin_accounts 테이블의 level ENUM에 'D0: 비전 담당자' 추가
-- 날짜: 2024-12-24

-- ENUM에 새로운 값을 추가하기 위해 ALTER TABLE 사용
ALTER TABLE admin_accounts 
MODIFY COLUMN level ENUM('A-SuperAdmin', 'S: Admin', 'B0: 중국Admin', 'C0: 한국Admin', 'D0: 비전 담당자') NOT NULL DEFAULT 'C0: 한국Admin' COMMENT '권한 레벨';

