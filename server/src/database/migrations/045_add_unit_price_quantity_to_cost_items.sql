-- 마이그레이션: 045_add_unit_price_quantity_to_cost_items
-- 설명: po_cost_items 테이블에 unit_price, quantity 컬럼 추가 (항목, 단가 x 수량 = 결과값 구조로 변경)
-- 날짜: 2024-12-30

-- 1. unit_price, quantity 컬럼 추가
ALTER TABLE po_cost_items
ADD COLUMN unit_price DECIMAL(10, 2) NULL COMMENT '단가' AFTER name,
ADD COLUMN quantity DECIMAL(10, 2) NULL COMMENT '수량' AFTER unit_price;

-- 2. 기존 데이터 마이그레이션: cost를 unit_price로 복사하고 quantity를 1로 설정
UPDATE po_cost_items
SET unit_price = cost,
    quantity = 1
WHERE unit_price IS NULL OR quantity IS NULL;

-- 3. unit_price, quantity를 NOT NULL로 변경 (기본값 설정 후)
ALTER TABLE po_cost_items
MODIFY COLUMN unit_price DECIMAL(10, 2) NOT NULL COMMENT '단가',
MODIFY COLUMN quantity DECIMAL(10, 2) NOT NULL DEFAULT 1 COMMENT '수량';

-- 4. cost 컬럼은 계산값이므로 업데이트 트리거 또는 애플리케이션 로직에서 처리
-- cost = unit_price * quantity로 계산하여 저장 (초기 마이그레이션용)
UPDATE po_cost_items
SET cost = unit_price * quantity;

-- 주의: 이후 cost는 애플리케이션 로직에서 unit_price * quantity로 계산하여 저장해야 함

