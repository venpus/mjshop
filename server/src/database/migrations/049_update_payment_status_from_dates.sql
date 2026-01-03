-- 마이그레이션: 049_update_payment_status_from_dates
-- 설명: 기존 DB 데이터의 payment_status를 선금/잔금 날짜 기준으로 재계산하여 업데이트
-- 날짜: 2024-12-28

-- 선금/잔금 날짜 기준으로 payment_status 자동 계산 및 업데이트
-- - 선금 날짜와 잔금 날짜가 모두 있으면 '완료'
-- - 선금 날짜만 있으면 '선금결제'
-- - 둘 다 없으면 '미결제'

UPDATE purchase_orders
SET payment_status = CASE
    WHEN advance_payment_date IS NOT NULL AND balance_payment_date IS NOT NULL THEN '완료'
    WHEN advance_payment_date IS NOT NULL THEN '선금결제'
    ELSE '미결제'
END;

