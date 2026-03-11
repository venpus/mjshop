-- 마이그레이션: 078_product_collab_status_progress
-- 설명: 제품 진행 상태를 조사중/샘플테스트/구성확정중/발주대기/입고중/생산중/생산완료/취소 로 통일
-- 날짜: 2025-03-08

-- 기존 status 값을 새 값으로 매핑
UPDATE product_collab_products SET status = 'RESEARCH'        WHERE status IN ('REQUEST', 'RESEARCH');
UPDATE product_collab_products SET status = 'SAMPLE_TEST'       WHERE status = 'SAMPLE';
UPDATE product_collab_products SET status = 'CONFIG_CONFIRM'   WHERE status IN ('CANDIDATE_REVIEW', 'MODEL_SELECT', 'SPEC_INPUT');
UPDATE product_collab_products SET status = 'ORDER_PENDING'    WHERE status IN ('ORDER_APPROVAL', 'READY_FOR_ORDER', 'ORDER_REGISTERED');
UPDATE product_collab_products SET status = 'PRODUCTION_COMPLETE' WHERE status = 'COMPLETED';
-- CANCELLED, INCOMING, IN_PRODUCTION 은 이미 새 값이거나 매핑 없음 (신규 생성용)
