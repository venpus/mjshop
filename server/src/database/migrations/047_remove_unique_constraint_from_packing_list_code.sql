-- 마이그레이션: 047_remove_unique_constraint_from_packing_list_code
-- 설명: 패킹리스트 코드의 UNIQUE 제약조건 제거 (코드와 날짜 조합으로 중복 체크)
-- 날짜: 2024-12-24

-- UNIQUE 제약조건 제거를 위해 기존 테이블 구조 변경
-- MySQL/MariaDB에서 UNIQUE 제약조건은 인덱스로 구현됨
-- code 컬럼의 UNIQUE 제약조건을 제거하고 일반 인덱스로 변경

-- 1. 기존 UNIQUE 인덱스 제거 (code 컬럼의 UNIQUE 제약조건으로 생성된 인덱스)
-- code 컬럼에 UNIQUE 제약조건이 있으면 자동으로 생성된 인덱스 이름이 'code'일 수 있음
DROP INDEX IF EXISTS code ON packing_lists;

-- 2. idx_code 인덱스가 있다면 제거 (중복 방지)
DROP INDEX IF EXISTS idx_code ON packing_lists;

-- 3. code 컬럼을 일반 인덱스로 재생성 (UNIQUE가 아닌 일반 인덱스)
ALTER TABLE packing_lists ADD INDEX idx_code (code);

