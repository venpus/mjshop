-- 마이그레이션: 020_update_logistics_info_with_foreign_keys
-- 설명: logistics_info 테이블의 inland_company와 company를 외래키(ID)로 변경
-- 날짜: 2024-12-24
-- 주의: 이 마이그레이션은 018과 019 마이그레이션 이후에 실행되어야 합니다.

-- 1. 새로운 ID 컬럼 추가 (NULL 허용, 데이터 마이그레이션 후 사용)
ALTER TABLE logistics_info
ADD COLUMN inland_company_id INT NULL COMMENT '내륙운송회사 ID (FK)' AFTER tracking_number,
ADD COLUMN warehouse_id INT NULL COMMENT '도착 창고 ID (FK)' AFTER inland_company;

-- 2. 기존 문자열 값을 옵션 테이블의 ID로 변환 (name 매칭)
-- inland_company (VARCHAR) -> inland_company_id (INT) 변환
UPDATE logistics_info li
INNER JOIN inland_companies ic ON li.inland_company = ic.name
SET li.inland_company_id = ic.id
WHERE li.inland_company IS NOT NULL AND li.inland_company != '';

-- company (VARCHAR) -> warehouse_id (INT) 변환
UPDATE logistics_info li
INNER JOIN warehouses w ON li.company = w.name
SET li.warehouse_id = w.id
WHERE li.company IS NOT NULL AND li.company != '';

-- 3. 외래키 제약조건 추가 (컬럼 삭제 전에 제약조건 추가)
ALTER TABLE logistics_info
ADD CONSTRAINT fk_logistics_inland_company
FOREIGN KEY (inland_company_id) REFERENCES inland_companies(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_logistics_warehouse
FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL;

-- 4. 인덱스 추가 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_inland_company_id ON logistics_info(inland_company_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_id ON logistics_info(warehouse_id);

-- 5. 기존 VARCHAR 컬럼 삭제 (외래키 설정 후)
ALTER TABLE logistics_info
DROP COLUMN inland_company,
DROP COLUMN company;

